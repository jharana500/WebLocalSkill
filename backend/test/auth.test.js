require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const stamp = Date.now();
const jobSeekerEmail = `phase2-jobseeker-${stamp}@test.local`;
const companyEmail = `phase2-company-${stamp}@test.local`;
const duplicateEmail = `phase2-duplicate-${stamp}@test.local`;
const resetEmail = `phase2-reset-${stamp}@test.local`;
const password = "testpass123";

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function captureResetToken(email) {
  const originalLog = console.log;
  let capturedUrl = null;
  console.log = (...args) => {
    const line = args.join(" ");
    if (line.includes("Password reset link")) capturedUrl = line;
  };
  try {
    await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email }),
    });
  } finally {
    console.log = originalLog;
  }
  if (!capturedUrl) return null;
  const match = capturedUrl.match(/token=([a-f0-9]+)/);
  return match ? match[1] : null;
}

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: duplicateEmail,
      password,
      role: "job_seeker",
      firstName: "Dup",
      lastName: "User",
    }),
  });

  await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: resetEmail,
      password,
      role: "job_seeker",
      firstName: "Reset",
      lastName: "User",
    }),
  });
});

after(async () => {
  const emails = [jobSeekerEmail, companyEmail, duplicateEmail, resetEmail];
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  server.close();
});

test("register: job seeker success returns fullName/email/role/avatarUrl shape", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: jobSeekerEmail,
      password,
      role: "job_seeker",
      firstName: "Ada",
      lastName: "Lovelace",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.user.fullName, "Ada Lovelace");
  assert.equal(body.data.user.email, jobSeekerEmail);
  assert.equal(body.data.user.role, "job_seeker");
  assert.equal(body.data.user.avatarUrl, null);
  assert.ok(body.data.token);
  assert.equal(body.data.user.password, undefined);
});

test("register: company success includes nested company data", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: companyEmail,
      password,
      role: "company",
      name: "Grace Hopper",
      companyName: "Cobol Inc",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.data.user.role, "company");
  assert.equal(body.data.user.company.name, "Cobol Inc");
});

test("register: weak password is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: `phase2-weak-${stamp}@test.local`,
      password: "allletters",
      role: "job_seeker",
      firstName: "Weak",
      lastName: "Pass",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("register: duplicate email is blocked with 409", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: duplicateEmail,
      password,
      role: "job_seeker",
      firstName: "Dup",
      lastName: "Again",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.message, "An account with this email already exists");
});

test("register: public admin registration is blocked", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: `phase2-admin-${stamp}@test.local`,
      password,
      role: "admin",
      firstName: "Should",
      lastName: "Fail",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("login: success returns token and standardized user shape", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: duplicateEmail, password }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.message, "Login successful");
  assert.equal(body.data.user.email, duplicateEmail);
  assert.ok(body.data.token);
});

test("login: invalid password returns generic 401 (no enumeration)", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: duplicateEmail, password: "wrongpassword" }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.message, "Invalid email or password");
});

test("login: unregistered email returns the same generic 401", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: "no-such-account@test.local",
      password: "whatever123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.message, "Invalid email or password");
});

test("GET /api/auth/me without a token returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test("GET /api/auth/me with a valid token returns the current user", async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: duplicateEmail, password }),
  });
  const { data } = await loginRes.json();

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.user.email, duplicateEmail);
  assert.equal(body.data.user.role, "job_seeker");
});

test("GET /api/auth/me with a malformed/expired token returns a session-expired message", async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: "Bearer not-a-real-jwt" },
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.message, "Session expired. Please log in again.");
});

test("wrong-role route (job seeker hitting a company-only route) is blocked with 403", async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: duplicateEmail, password }),
  });
  const { data } = await loginRes.json();

  const res = await fetch(
    `${baseUrl}/api/applications/company?page=1&limit=10`,
    { headers: { Authorization: `Bearer ${data.token}` } },
  );
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.success, false);
});

test("forgot-password: existing email returns neutral success and creates a reset token", async () => {
  const token = await captureResetToken(resetEmail);
  assert.ok(token, "expected a reset token to be logged in development");
});

test("forgot-password: unknown email returns the identical neutral response", async () => {
  const resKnown = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: resetEmail }),
  });
  const bodyKnown = await resKnown.json();

  const resUnknown = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: "definitely-not-registered@test.local" }),
  });
  const bodyUnknown = await resUnknown.json();

  assert.equal(resKnown.status, resUnknown.status);
  assert.equal(bodyKnown.message, bodyUnknown.message);
});

test("reset-password: invalid token is rejected with 400", async () => {
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      token: "not-a-real-token",
      password: "newpassword123",
      confirmPassword: "newpassword123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.message, "The reset link is invalid or has expired.");
});

test("reset-password: mismatched confirmPassword is rejected", async () => {
  const token = await captureResetToken(resetEmail);
  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      token,
      password: "newpassword123",
      confirmPassword: "doesnotmatch123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("reset-password: expired token is rejected", async () => {
  const token = await captureResetToken(resetEmail);
  const tokenHash = require("crypto")
    .createHash("sha256")
    .update(token)
    .digest("hex");
  await prisma.passwordReset.update({
    where: { tokenHash },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      token,
      password: "newpassword123",
      confirmPassword: "newpassword123",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.message, "The reset link is invalid or has expired.");
});

test("reset-password: valid token updates the password, invalidates the token, and old password stops working", async () => {
  const token = await captureResetToken(resetEmail);
  const newPassword = "brandnewpass123";

  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      token,
      password: newPassword,
      confirmPassword: newPassword,
    }),
  });
  const resetBody = await resetRes.json();
  assert.equal(resetRes.status, 200);
  assert.equal(resetBody.success, true);

  const reuseRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      token,
      password: "anotherpass123",
      confirmPassword: "anotherpass123",
    }),
  });
  assert.equal(reuseRes.status, 400);

  const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: resetEmail, password }),
  });
  assert.equal(oldLoginRes.status, 401);

  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: resetEmail, password: newPassword }),
  });
  assert.equal(newLoginRes.status, 200);
});
