const ROLE_ALIASES = {
  employer: "company",
  worker: "job_seeker",
}

export function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase().replace(/-/g, "_")
  return ROLE_ALIASES[normalized] || normalized
}

const ROLE_DASHBOARD_PATHS = {
  admin: "/admin/dashboard",
  company: "/company/dashboard",
  job_seeker: "/dashboard",
}

export function getRoleDashboardPath(role) {
  return ROLE_DASHBOARD_PATHS[normalizeRole(role)] || null
}
