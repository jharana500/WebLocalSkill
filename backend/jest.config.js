module.exports = {
  testEnvironment: "node",
  // Scoped to tests/ only so this config never picks up the existing
  // backend/test/ node:test suite (different runner, incompatible API).
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
};
