// Jest + Supertest demonstration suite.
//
// Purpose: show both passing and intentionally failing API tests side by
// side for a testing demonstration. This is NOT a quality gate and must
// not be wired into CI (see "npm run test:demo" in package.json and the
// README section "Jest and Supertest Demonstration").
//
// 10 tests total: 7 real, passing assertions against actual API behaviour,
// and 3 assertions that are deliberately wrong so Jest reports them as
// failed. None of the 3 failures reflect a real defect in the app.

const request = require("supertest");
const app = require("../server");
const prisma = require("../src/lib/prisma");

describe("LocalSkill API demonstration tests", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("PASS: health endpoint returns a successful response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("PASS: health endpoint returns JSON", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["content-type"]).toMatch(/json/);
    expect(typeof response.body).toBe("object");
  });

  test("PASS: login rejects missing credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("PASS: protected endpoint rejects a missing token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("PASS: unknown API endpoint returns JSON 404", async () => {
    const response = await request(app).get("/api/this-route-does-not-exist");

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toMatch(/json/);
  });

  test("PASS: register rejects a request missing required fields", async () => {
    const response = await request(app).post("/api/auth/register").send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("PASS: refresh token endpoint responds not implemented", async () => {
    const response = await request(app).post("/api/auth/refresh").send({});

    expect(response.statusCode).toBe(501);
    expect(response.body.success).toBe(false);
  });

  // These assertions are intentionally incorrect for the testing demonstration.
  // They must remain failing so Jest reports 3 failed and 7 passed tests.
  // Do not "fix" these by changing the assertions or the application code.

  test("INTENTIONAL FAIL: protected endpoint should allow access without token", async () => {
    const response = await request(app).get("/api/auth/me");

    // Real behaviour is 401 (see the PASS test above). This is deliberately wrong.
    expect(response.statusCode).toBe(200);
  });

  test("INTENTIONAL FAIL: invalid login should return success", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    // Real behaviour is success: false (see the PASS test above). This is deliberately wrong.
    expect(response.body.success).toBe(true);
  });

  test("INTENTIONAL FAIL: unknown API route should exist", async () => {
    const response = await request(app).get("/api/this-route-does-not-exist");

    // Real behaviour is 404 (see the PASS test above). This is deliberately wrong.
    expect(response.statusCode).toBe(200);
  });
});
