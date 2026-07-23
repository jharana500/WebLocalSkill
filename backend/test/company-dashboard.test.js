require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const stamp = Date.now();
const password = "testpass123";

const companyAEmail = `phase5-companya-${stamp}@test.local`;
const companyBEmail = `phase5-companyb-${stamp}@test.local`;
const jobSeekerEmail = `phase5-jobseeker-${stamp}@test.local`;

let companyAToken, companyBToken, jsToken;
let companyAId, companyBId;

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

  const a = await registerCompany(companyAEmail, "Dashboard Test Co A");
  companyAToken = a.token;
  companyAId = a.companyId;

  const b = await registerCompany(companyBEmail, "Dashboard Test Co B");
  companyBToken = b.token;
  companyBId = b.companyId;

  await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: jobSeekerEmail, password, role: "job_seeker", firstName: "Dash", lastName: "Board",
    }),
  });
  const jsLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail, password }),
  });
  jsToken = (await jsLogin.json()).data.token;

  // Mirror what the real admin-verify transition does: flip isVerified AND
  // create the CompanyVerification row with status VERIFIED — the dashboard
  // reads company.verification.status, not the boolean alone.
  await prisma.company.update({ where: { id: companyAId }, data: { isVerified: true } });
  await prisma.companyVerification.create({
    data: { companyId: companyAId, status: "VERIFIED" },
  });
});

after(async () => {
  const emails = [companyAEmail, companyBEmail, jobSeekerEmail];
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.application.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.job.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.companyVerification.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
  server.close();
});

test("dashboard: zero-data company gets safe zero metrics, not a crash", async () => {
  const res = await fetch(`${baseUrl}/api/company/dashboard`, {
    headers: { Authorization: `Bearer ${companyBToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.metrics.totalJobs, 0);
  assert.equal(body.data.metrics.totalApplications, 0);
  assert.equal(body.data.metrics.verificationStatus, "PENDING");
  assert.deepEqual(body.data.recentApplications, []);
  assert.deepEqual(body.data.recentActivity, []);
});

test("dashboard: returns real, non-fabricated metrics for a company with data", async () => {
  await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({
      title: "Dashboard Job", description: "desc", jobType: "full_time", category: "Tech", status: "ACTIVE",
    }),
  });
  const res = await fetch(`${baseUrl}/api/company/dashboard`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const body = await res.json();
  assert.equal(body.data.metrics.totalJobs, 1);
  assert.equal(body.data.metrics.activeJobs, 1);
  assert.equal(body.data.metrics.verificationStatus, "VERIFIED");
  assert.equal(body.data.recentJobs[0].title, "Dashboard Job");
});

test("company profile: can update own profile including new fields", async () => {
  const res = await fetch(`${baseUrl}/api/company/profile`, {
    method: "PUT",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyBToken}` },
    body: JSON.stringify({ tagline: "We build things", foundedYear: 2018, email: "hr@companyb.test" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.company.tagline, "We build things");
  assert.equal(body.data.company.foundedYear, 2018);
});

test("company profile: cannot set verification status via the profile endpoint", async () => {
  const res = await fetch(`${baseUrl}/api/company/profile`, {
    method: "PUT",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyBToken}` },
    body: JSON.stringify({ isVerified: true, status: "SUSPENDED" }),
  });
  assert.equal(res.status, 200);
  const check = await prisma.company.findUnique({ where: { id: companyBId } });
  assert.equal(check.isVerified, false);
  assert.equal(check.status, "ACTIVE");
});

let draftJobId, activeJobId;

test("jobs: unverified company can create a draft but not publish", async () => {
  const draftRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyBToken}` },
    body: JSON.stringify({
      title: "Unverified Draft", description: "desc", jobType: "full_time", category: "Tech",
      salaryMin: 50000, salaryMax: 70000, experience: "mid", benefits: "Health", openings: 2,
      status: "DRAFT",
    }),
  });
  const draftBody = await draftRes.json();
  assert.equal(draftRes.status, 201);
  assert.equal(draftBody.data.job.status, "DRAFT");
  assert.equal(draftBody.data.job.salaryMin, 50000);
  draftJobId = draftBody.data.job.id;

  const publishRes = await fetch(`${baseUrl}/api/jobs/${draftJobId}/publish`, {
    method: "PATCH", headers: { Authorization: `Bearer ${companyBToken}` },
  });
  assert.equal(publishRes.status, 403);
});

test("jobs: omitting status entirely defaults to publish-attempt, so an unverified company still gets blocked", async () => {
  const res = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyBToken}` },
    body: JSON.stringify({ title: "No Status Field", description: "desc", jobType: "full_time", category: "Tech" }),
  });
  assert.equal(res.status, 403);
});

test("jobs: verified company can publish", async () => {
  const res = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({ title: "Verified Publish Job", description: "desc", jobType: "full_time", category: "Tech", status: "ACTIVE" }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.data.job.status, "ACTIVE");
  activeJobId = body.data.job.id;
});

test("jobs: a company cannot edit another company's job", async () => {
  const res = await fetch(`${baseUrl}/api/jobs/${activeJobId}`, {
    method: "PUT",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyBToken}` },
    body: JSON.stringify({ title: "Hijacked" }),
  });
  assert.equal(res.status, 404);
});

test("jobs: company can close its own active job", async () => {
  const res = await fetch(`${baseUrl}/api/jobs/${activeJobId}/close`, {
    method: "PATCH", headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.job.status, "CLOSED");
});

test("jobs: a job with applications cannot be hard-deleted", async () => {
  const jobRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({ title: "Has Applicant", description: "desc", jobType: "full_time", category: "Tech", status: "ACTIVE" }),
  });
  const job = (await jobRes.json()).data.job;

  await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${jsToken}` },
    body: JSON.stringify({ jobId: job.id }),
  });

  const deleteRes = await fetch(`${baseUrl}/api/jobs/${job.id}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${companyAToken}` },
  });
  assert.equal(deleteRes.status, 409);

  const stillThere = await prisma.job.findUnique({ where: { id: job.id } });
  assert.ok(stillThere, "job should not have been deleted");
});

test("applicants: company can list its own applicants, and cannot see another company's", async () => {
  const ownRes = await fetch(`${baseUrl}/api/applications/company`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const ownBody = await ownRes.json();
  assert.equal(ownRes.status, 200);
  assert.ok(ownBody.data.applications.length >= 1);

  const otherRes = await fetch(`${baseUrl}/api/applications/company`, {
    headers: { Authorization: `Bearer ${companyBToken}` },
  });
  const otherBody = await otherRes.json();
  assert.equal(otherBody.data.applications.length, 0);
});

let applicationId;

test("application status: valid transition works and creates a notification", async () => {
  const listRes = await fetch(`${baseUrl}/api/applications/company`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const list = (await listRes.json()).data.applications;
  applicationId = list[0].id;

  const res = await fetch(`${baseUrl}/api/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({ status: "SHORTLISTED" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.application.status, "SHORTLISTED");

  const notification = await prisma.notification.findFirst({
    where: { user: { email: jobSeekerEmail }, type: "APPLICATION_STATUS" },
  });
  assert.ok(notification);
  assert.match(notification.message, /shortlisted/i);
});

test("application status: invalid transition is rejected with 409", async () => {
  const res = await fetch(`${baseUrl}/api/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({ status: "REVIEWING" }),
  });
  assert.equal(res.status, 409);
});

test("notifications: list, mark-read, and mark-all-read work", async () => {
  const listRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${jsToken}` },
  });
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.ok(listBody.data.unreadCount >= 1);

  const notifId = listBody.data.notifications[0].id;
  const readRes = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
    method: "PATCH", headers: { Authorization: `Bearer ${jsToken}` },
  });
  assert.equal(readRes.status, 200);

  const markAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
    method: "PATCH", headers: { Authorization: `Bearer ${jsToken}` },
  });
  assert.equal(markAllRes.status, 200);

  const finalList = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${jsToken}` },
  });
  const finalBody = await finalList.json();
  assert.equal(finalBody.data.unreadCount, 0);
});

test("analytics: returns real arrays, not fabricated data", async () => {
  const res = await fetch(`${baseUrl}/api/company/analytics`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.data.appTrend));
  assert.ok(Array.isArray(body.data.jobPerformance));
  assert.ok(Array.isArray(body.data.jobsByStatus));
  assert.equal(typeof body.data.averageApplicationsPerJob, "number");
});

test("settings: company user can use the previously job-seeker-only account routes", async () => {
  const prefRes = await fetch(`${baseUrl}/api/user/notifications`, {
    method: "PUT",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyAToken}` },
    body: JSON.stringify({ newApplication: false }),
  });
  assert.equal(prefRes.status, 200);

  const getRes = await fetch(`${baseUrl}/api/user/notifications`, {
    headers: { Authorization: `Bearer ${companyAToken}` },
  });
  const getBody = await getRes.json();
  assert.equal(getBody.data.settings.newApplication, false);
});
