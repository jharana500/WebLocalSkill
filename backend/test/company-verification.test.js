require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const stamp = Date.now();
const password = "testpass123";

const adminEmail = `phase4-admin-${stamp}@test.local`;
const companyAEmail = `phase4-companya-${stamp}@test.local`;
const companyBEmail = `phase4-companyb-${stamp}@test.local`;
// Deliberately a different email domain so the "unrelated company" test
// isn't accidentally flagged via the shared-domain signal.
const companyCEmail = `phase4-companyc-${stamp}@unrelated-test.example`;
const jobSeekerEmail = `phase4-jobseeker-${stamp}@test.local`;

let adminToken;
let companyAToken;
let companyBToken;
let companyCToken;
let companyAId;
let companyBId;
let companyCId;

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function registerCompany(email, companyName) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password, role: "company", companyName }),
  });
  const body = await res.json();
  return { token: body.data.token, companyId: body.data.user.company.id };
}

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { email: adminEmail, password: hashed, role: "ADMIN" },
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: adminEmail, password }),
  });
  adminToken = (await adminLogin.json()).data.token;

  const a = await registerCompany(companyAEmail, "Duplicate Detection Test Co");
  companyAToken = a.token;
  companyAId = a.companyId;

  const b = await registerCompany(companyBEmail, "Duplicate Detection Test Co");
  companyBToken = b.token;
  companyBId = b.companyId;

  const c = await registerCompany(companyCEmail, "Totally Unrelated Business Nepal");
  companyCToken = c.token;
  companyCId = c.companyId;

  await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: jobSeekerEmail,
      password,
      role: "job_seeker",
      firstName: "Job",
      lastName: "Seeker",
    }),
  });

  // Give A and B a matching registration number for the high-risk test.
  await prisma.companyVerification.create({
    data: { companyId: companyAId, registrationNumber: "REG-12345", panNumber: "PAN-99999" },
  });
  await prisma.companyVerification.create({
    data: { companyId: companyBId, registrationNumber: "REG-12345", panNumber: "PAN-99999" },
  });

  admin.id; // keep reference alive for linting
});

after(async () => {
  const emails = [adminEmail, companyAEmail, companyBEmail, companyCEmail, jobSeekerEmail];
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.job.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: userIds } } });
  await prisma.companyVerification.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  server.close();
});

test("non-admin cannot list companies for verification review", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  assert.equal(res.status, 403);
});

test("admin can list companies", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.companies));
  assert.ok(body.data.pagination);
});

test("admin list can filter by verificationStatus", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies?verificationStatus=PENDING`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.companies.every((c) => (c.verification?.status || "PENDING") === "PENDING"));
});

test("admin can fetch company detail with owner/verification/audit shape", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.id, companyAId);
  assert.equal(body.data.company.user.email, companyAEmail.toLowerCase());
  assert.ok(Array.isArray(body.data.auditLog));
  assert.equal(typeof body.data.applicationCount, "number");
});

test("duplicate check excludes the company itself and finds the registration-number match", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/duplicate-check`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(!body.data.matches.some((m) => m.companyId === companyAId));
  const matchB = body.data.matches.find((m) => m.companyId === companyBId);
  assert.ok(matchB, "expected company B to appear as a match");
  assert.ok(matchB.reasons.includes("Registration number matches"));
});

test("exact registration number and PAN match together produce HIGH risk", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/duplicate-check`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(body.data.riskLevel, "HIGH");
  assert.ok(body.data.riskScore >= 70);
});

test("generic/unrelated company names alone do not produce a false match", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyCId}/duplicate-check`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.matches.length, 0);
  assert.equal(body.data.riskLevel, "LOW");
});

test("company owner cannot modify their own verification status directly", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyCId}/verify`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyCToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 403);
});

test("admin can mark a company under review, creating an audit log and notification", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyCId}/under-review`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.verification.status, "UNDER_REVIEW");

  const log = await prisma.adminAuditLog.findFirst({
    where: { entityType: "Company", entityId: companyCId, action: "UNDER_REVIEW" },
  });
  assert.ok(log, "expected an audit log entry");

  const notification = await prisma.notification.findFirst({
    where: { user: { email: companyCEmail }, type: "COMPANY_VERIFICATION" },
  });
  assert.ok(notification, "expected a notification");
  assert.equal(notification.title, "Verification under review");
});

test("unverified company cannot publish an active job, but can save a draft", async () => {
  // Job creation's draft/publish intent moved from a boolean `isActive` to an
  // explicit `status` field in Phase 5 (job.controller.js) — updated here to
  // match the current contract (see PHASE_5_COMPLETION_REPORT.md).
  const draftRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyCToken}` },
    body: JSON.stringify({
      title: "Draft Role",
      description: "desc",
      jobType: "full_time",
      category: "Tech",
      status: "DRAFT",
    }),
  });
  const draftBody = await draftRes.json();
  assert.equal(draftRes.status, 201);
  assert.equal(draftBody.data.job.status, "DRAFT");
  assert.equal(draftBody.data.job.isActive, false);

  const publishRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyCToken}` },
    body: JSON.stringify({
      title: "Should Fail",
      description: "desc",
      jobType: "full_time",
      category: "Tech",
      status: "ACTIVE",
    }),
  });
  assert.equal(publishRes.status, 403);
});

test("admin can verify a company, after which it can publish active jobs", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyCId}/verify`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.isVerified, true);
  assert.equal(body.data.company.verification.status, "VERIFIED");

  const publishRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyCToken}` },
    body: JSON.stringify({
      title: "Now Allowed",
      description: "desc",
      jobType: "full_time",
      category: "Tech",
    }),
  });
  const publishBody = await publishRes.json();
  assert.equal(publishRes.status, 201);
  assert.equal(publishBody.data.job.isActive, true);
});

test("rejection without a reason is rejected with 400", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/reject`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test("admin can reject with a reason", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/reject`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ reason: "Registration document could not be verified." }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.verification.status, "REJECTED");
  assert.equal(body.data.company.isVerified, false);
});

test("a company cannot be marked as a duplicate of itself", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/under-review`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 200);

  const dupRes = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/mark-duplicate`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ duplicateOfCompanyId: companyAId, reason: "self reference" }),
  });
  assert.equal(dupRes.status, 400);
});

test("admin can mark a company as a duplicate of another", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/mark-duplicate`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ duplicateOfCompanyId: companyBId, reason: "Registration number and PAN match" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.verification.status, "DUPLICATE");
  assert.equal(body.data.company.verification.duplicateOfCompany.id, companyBId);
});

test("restoring a company clears the duplicate link and creates a new audit entry", async () => {
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyAId}/restore`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "PENDING", reason: "Company submitted corrected documents" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.verification.status, "PENDING");
  assert.equal(body.data.company.verification.duplicateOfCompanyId, null);

  const logs = await prisma.adminAuditLog.findMany({
    where: { entityType: "Company", entityId: companyAId },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(logs.some((l) => l.action === "RESTORED"));
});

test("re-applying the same status is rejected with a readable message instead of a no-op audit entry", async () => {
  await fetch(`${baseUrl}/api/admin/companies/${companyBId}/verify`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  const res = await fetch(`${baseUrl}/api/admin/companies/${companyBId}/verify`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.message, /already verified/i);
});
