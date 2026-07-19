const { sendError } = require("../utils/response");

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function expandRoleAliases(role) {
  const normalized = normalizeRole(role);
  if (normalized === "employer") return ["employer", "company"];
  if (normalized === "company") return ["company", "employer"];
  if (normalized === "worker") return ["worker", "job_seeker"];
  if (normalized === "job_seeker") return ["job_seeker", "worker"];
  return [normalized];
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Authentication required");
    }

    const userRole = normalizeRole(req.user.role);
    const allowed = roles.flatMap(expandRoleAliases);

    if (!allowed.includes(userRole)) {
      return sendError(
        res,
        403,
        "You are not authorized to access this resource",
      );
    }

    next();
  };
}

module.exports = { requireRole, normalizeRole };
