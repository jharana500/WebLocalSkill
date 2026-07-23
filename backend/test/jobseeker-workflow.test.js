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

const adminEmail = `release-admin-${stamp}@test.local`;
const companyEmail = `release-company-${stamp}@test.local`;
const jobSeekerEmail = `release-jobseeker-${stamp}@test.local`;

let adminToken;
let companyToken;
let companyId;
let jobSeekerToken;
let midJobId;
let seniorJobId;

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email: adminEmail, password: hashed, role: "ADMIN" } });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: adminEmail, password }),
  });
  adminToken = (await adminLogin.json()).data.token;

  const companyReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: companyEmail, password, role: "company", companyName: "Release Workflow Test Co" }),
  });
  const companyBody = await companyReg.json();
  companyToken = companyBody.data.token;
  companyId = companyBody.data.user.company.id;

  await fetch(`${baseUrl}/api/company/verification`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyToken}` },
    body: JSON.stringify({ panNumber: `PAN-${stamp}`, registrationNumber: `REG-${stamp}` }),
  });
  await fetch(`${baseUrl}/api/admin/companies/${companyId}/verify`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({}),
  });

  const midJobRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyToken}` },
    body: JSON.stringify({
      title: "Mid Level Engineer", description: "Build things", jobType: "full_time",
      experience: "mid", category: "Technology & IT", district: "Kathmandu", status: "ACTIVE",
    }),
  });
  midJobId = (await midJobRes.json()).data.job.id;

  const seniorJobRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${companyToken}` },
    body: JSON.stringify({
      title: "Senior Engineer", description: "Lead things", jobType: "full_time",
      experience: "senior", category: "Technology & IT", district: "Kathmandu", status: "ACTIVE",
    }),
  });
  seniorJobId = (await seniorJobRes.json()).data.job.id;

  const jsReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail, password, role: "job_seeker", firstName: "Release", lastName: "Tester" }),
  });
  jobSeekerToken = (await jsReg.json()).data.token;
});

after(async () => {
  const emails = [adminEmail, companyEmail, jobSeekerEmail];
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.savedJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.application.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: userIds } } });
  await prisma.job.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.companyVerification.deleteMany({ where: { company: { userId: { in: userIds } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  server.close();
});

test("jobs: experience filter only returns matching jobs", async () => {
  const midRes = await fetch(`${baseUrl}/api/jobs?experience=mid`);
  const midBody = await midRes.json();
  const midIds = midBody.data.jobs.map((j) => j.id);
  assert.ok(midIds.includes(midJobId));
  assert.ok(!midIds.includes(seniorJobId));

  const seniorRes = await fetch(`${baseUrl}/api/jobs?experience=senior`);
  const seniorBody = await seniorRes.json();
  const seniorIds = seniorBody.data.jobs.map((j) => j.id);
  assert.ok(seniorIds.includes(seniorJobId));
  assert.ok(!seniorIds.includes(midJobId));
});

test("saved jobs: save then list returns job objects keyed by id (the shape the frontend relies on)", async () => {
  const saveRes = await fetch(`${baseUrl}/api/saved-jobs/${midJobId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jobSeekerToken}` },
  });
  assert.equal(saveRes.status, 201);

  const listRes = await fetch(`${baseUrl}/api/saved-jobs`, {
    headers: { Authorization: `Bearer ${jobSeekerToken}` },
  });
  const listBody = await listRes.json();
  assert.equal(listBody.data.savedJobs.length, 1);
  assert.equal(listBody.data.savedJobs[0].id, midJobId);
});

test("profile: title, linkedin, github, and website persist across save and reload", async () => {
  const update = await fetch(`${baseUrl}/api/user/profile`, {
    method: "PUT",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${jobSeekerToken}` },
    body: JSON.stringify({
      firstName: "Release", lastName: "Tester", title: "QA Engineer",
      linkedin: "https://linkedin.com/in/release-tester",
      github: "https://github.com/release-tester",
      website: "https://release-tester.dev",
    }),
  });
  assert.equal(update.status, 200);

  const reload = await fetch(`${baseUrl}/api/user/profile`, {
    headers: { Authorization: `Bearer ${jobSeekerToken}` },
  });
  const body = await reload.json();
  assert.equal(body.data.profile.title, "QA Engineer");
  assert.equal(body.data.profile.linkedin, "https://linkedin.com/in/release-tester");
  assert.equal(body.data.profile.github, "https://github.com/release-tester");
  assert.equal(body.data.profile.website, "https://release-tester.dev");
});
