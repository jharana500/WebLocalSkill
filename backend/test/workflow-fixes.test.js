require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const stamp = Date.now();
const password = "testpass123";
const jobSeekerEmail = `wf-jobseeker-${stamp}@test.local`;

let jobSeekerToken;

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

function authHeaders(token) {
  return { ...jsonHeaders(), Authorization: `Bearer ${token}` };
}

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: jobSeekerEmail,
      password,
      role: "job_seeker",
      firstName: "Work",
      lastName: "Flow",
    }),
  });
  const registerBody = await registerRes.json();
  jobSeekerToken = registerBody.data.token;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: jobSeekerEmail } });
  await prisma.$disconnect();
  server.close();
});

// --- Password update (Issues 5 & 6) ---------------------------------------

test("change-password: wrong current password is rejected with 400", async () => {
  const res = await fetch(`${baseUrl}/api/user/change-password`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      currentPassword: "wrongpassword",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /incorrect/i);
});

test("change-password: mismatched confirmPassword is rejected without touching the password", async () => {
  const res = await fetch(`${baseUrl}/api/user/change-password`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      currentPassword: password,
      newPassword: "newpassword123",
      confirmPassword: "doesnotmatch123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /do not match/i);

  // Confirm the original password still works.
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail, password }),
  });
  assert.equal(loginRes.status, 200);
});

test("change-password: succeeds with correct current password and matching confirmation", async () => {
  const newPassword = "brandnewpass123";
  const res = await fetch(`${baseUrl}/api/user/change-password`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      currentPassword: password,
      newPassword,
      confirmPassword: newPassword,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);

  const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail, password }),
  });
  assert.equal(oldLoginRes.status, 401);

  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail, password: newPassword }),
  });
  assert.equal(newLoginRes.status, 200);
});

test("change-password: rejects a new password identical to the current one", async () => {
  const currentPassword = "brandnewpass123";
  const res = await fetch(`${baseUrl}/api/user/change-password`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      currentPassword,
      newPassword: currentPassword,
      confirmPassword: currentPassword,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.message, /different from your current password/i);
});

// --- Contact form (Issue 9) ------------------------------------------------

test("contact: empty submission is rejected with per-field errors", async () => {
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name: "", email: "", subject: "", message: "" }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(Array.isArray(body.errors));
  assert.ok(body.errors.some((e) => e.field === "name"));
  assert.ok(body.errors.some((e) => e.field === "email"));
  assert.ok(body.errors.some((e) => e.field === "subject"));
  assert.ok(body.errors.some((e) => e.field === "message"));
});

test("contact: invalid email format is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      name: "Test User",
      email: "not-an-email",
      subject: "general",
      message: "This is a long enough test message.",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.ok(body.errors.some((e) => e.field === "email"));
});

test("contact: without SMTP configured, a valid submission fails loudly instead of faking success", async () => {
  // SMTP is intentionally unconfigured in the test environment — the route
  // must not claim the message was sent when it wasn't.
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      name: "Test User",
      email: "test@test.local",
      subject: "general",
      message: "This is a long enough test message.",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 502);
  assert.equal(body.success, false);
});

// --- Billing plans consistency (Issue 10) ----------------------------------

test("public /api/plans and authenticated /api/company/billing/plans return identical amounts", async () => {
  const publicRes = await fetch(`${baseUrl}/api/plans`);
  const publicBody = await publicRes.json();
  assert.equal(publicRes.status, 200);
  const publicPlans = publicBody.data.plans;

  const companyRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: `wf-company-${stamp}@test.local`,
      password,
      role: "company",
      companyName: "Workflow Fixes Test Co",
    }),
  });
  const companyBody = await companyRes.json();
  const companyToken = companyBody.data.token;

  const billingRes = await fetch(`${baseUrl}/api/company/billing/plans`, {
    headers: { Authorization: `Bearer ${companyToken}` },
  });
  const billingBody = await billingRes.json();
  assert.equal(billingRes.status, 200);
  const billingPlans = billingBody.data.plans;

  assert.equal(publicPlans.length, billingPlans.length);
  for (const plan of publicPlans) {
    const match = billingPlans.find((p) => p.id === plan.id);
    assert.ok(match, `expected plan ${plan.id} in billing plans`);
    assert.equal(match.monthlyAmount, plan.monthlyAmount);
    assert.equal(match.currency, plan.currency);
  }

  await prisma.user.deleteMany({ where: { email: `wf-company-${stamp}@test.local` } });
});

// --- Education year validation (Issue 2) -----------------------------------

test("education: missing start year is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/user/education`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({ institution: "Test University", degree: "B.Sc." }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.message, /start year/i);
});

test("education: end year before start year is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/user/education`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      institution: "Test University",
      degree: "B.Sc.",
      startYear: 2020,
      endYear: 2018,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.message, /end year/i);
});

test("education: valid entry with isCurrent persists with a null end year", async () => {
  const res = await fetch(`${baseUrl}/api/user/education`, {
    method: "POST",
    headers: authHeaders(jobSeekerToken),
    body: JSON.stringify({
      institution: "Test University",
      degree: "B.Sc. Computer Science",
      startYear: 2022,
      isCurrent: true,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.data.education.startYear, 2022);
  assert.equal(body.data.education.endYear, null);
  assert.equal(body.data.education.isCurrent, true);
});

test("forgot-password: missing SMTP configuration does not crash the request", async () => {
  const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: jobSeekerEmail }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
});
