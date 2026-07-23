require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const prisma = require("../src/lib/prisma");

let baseUrl;
let server;
const testEmail = `phase1-test-company-${Date.now()}@test.local`;
const testPassword = "testpass123";
let companyToken;

before(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      role: "company",
      companyName: "Runtime Test Co",
    }),
  });
  const registerBody = await registerRes.json();
  companyToken = registerBody.data.token;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
  server.close();
});

test("GET /api/health returns a clean success envelope", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
});

test("GET /api/applications/company without a token returns 401 JSON, not a 500", async () => {
  const res = await fetch(
    `${baseUrl}/api/applications/company?page=1&limit=10`,
  );
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, "Authentication required");
});

test("GET /api/applications/company with a company token returns 200 with a safe empty-state shape", async () => {
  const res = await fetch(
    `${baseUrl}/api/applications/company?page=1&limit=10`,
    { headers: { Authorization: `Bearer ${companyToken}` } },
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.applications, []);
  assert.equal(body.data.pagination.total, 0);
  assert.equal(body.data.pagination.totalPages, 0);
});

test("GET /api/company/subscription returns a safe Free-plan fallback", async () => {
  const res = await fetch(`${baseUrl}/api/company/subscription`, {
    headers: { Authorization: `Bearer ${companyToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.subscription.plan, "FREE");
  assert.equal(body.data.subscription.amount, 0);
});

test("GET /api/company/billing/history returns a safe empty-array fallback", async () => {
  const res = await fetch(`${baseUrl}/api/company/billing/history`, {
    headers: { Authorization: `Bearer ${companyToken}` },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.data.history, []);
});

test("POST /api/auth/login with invalid credentials returns 401 with a generic message", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nobody-out-there@test.local",
      password: "wrongpassword",
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, "Invalid email or password");
});

test("unknown route returns clean 404 JSON, never an HTML error page", async () => {
  const res = await fetch(`${baseUrl}/api/this-route-does-not-exist`);
  const contentType = res.headers.get("content-type") || "";
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.ok(contentType.includes("application/json"));
  assert.equal(body.success, false);
});
