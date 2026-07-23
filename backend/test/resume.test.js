require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const stamp = Date.now();
const userAEmail = `phase3-resume-a-${stamp}@test.local`;
const userBEmail = `phase3-resume-b-${stamp}@test.local`;
const password = "testpass123";
let tokenA;
let tokenB;

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function registerAndLogin(email) {
  await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email,
      password,
      role: "job_seeker",
      firstName: "Resume",
      lastName: "Tester",
    }),
  });
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const { data } = await loginRes.json();
  return data.token;
}

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  tokenA = await registerAndLogin(userAEmail);
  tokenB = await registerAndLogin(userBEmail);
});

after(async () => {
  await prisma.resume.deleteMany({
    where: { user: { email: { in: [userAEmail, userBEmail] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [userAEmail, userBEmail] } },
  });
  await prisma.$disconnect();
  server.close();
});

test("GET /api/resumes/me without a token is blocked with 401", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test("GET /api/resumes/me for a brand-new user returns a safe null resume", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.resume, null);
});

test("POST /api/resumes/me creates a resume draft owned by the authenticated user", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: "Ada Lovelace",
      email: userAEmail,
      title: "Software Engineer",
      summary: "Builds things.",
      experience: [{ role: "Engineer", company: "Analytical Engines Ltd" }],
      skills: "JavaScript, Node.js",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.resume.personalData.name, "Ada Lovelace");
  assert.deepEqual(body.data.resume.skills, ["JavaScript", "Node.js"]);
  assert.equal(body.data.resume.experience.length, 1);
});

test("GET /api/resumes/me now returns the saved resume for that user", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.resume.personalData.name, "Ada Lovelace");
});

test("POST /api/resumes/me updates (upserts) the existing draft rather than duplicating it", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: "Ada Lovelace",
      title: "Principal Engineer",
      email: userAEmail,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.resume.personalData.title, "Principal Engineer");

  const count = await prisma.resume.count({
    where: { user: { email: userAEmail } },
  });
  assert.equal(count, 1);
});

test("a user cannot see another user's resume", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.resume, null);
});

test("malformed non-array sections are normalized instead of crashing", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      name: "Grace Hopper",
      experience: "not-an-array",
      education: { degree: "not-an-array-either" },
      skills: 12345,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.data.resume.experience, []);
  assert.deepEqual(body.data.resume.education, []);
  assert.deepEqual(body.data.resume.skills, []);
});

test("invalid email in personalData is rejected with 400", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    method: "POST",
    headers: { ...jsonHeaders(), Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      name: "Grace Hopper",
      email: "not-an-email",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("DELETE /api/resumes/me removes only the authenticated user's resume", async () => {
  const res = await fetch(`${baseUrl}/api/resumes/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(res.status, 200);

  const afterDelete = await fetch(`${baseUrl}/api/resumes/me`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const afterBody = await afterDelete.json();
  assert.equal(afterBody.data.resume, null);

  const stillThereForA = await fetch(`${baseUrl}/api/resumes/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const aBody = await stillThereForA.json();
  assert.notEqual(aBody.data.resume, null);
});
