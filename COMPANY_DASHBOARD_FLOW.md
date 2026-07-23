# Company Dashboard & Workflow — Audit & Design

## Audit method

Read every company-side frontend page and its corresponding backend route/controller end-to-end, plus every job-seeker/public page that also renders `Job` fields (since several turned out to share the same silent data-loss bug). Grepped for every field name the frontend actually sends/reads, not just what the schema currently has, to find fields that are collected but silently dropped.

## The one big finding: job creation has been losing most of its data since it was built

`PostJob.jsx` and `EditJob.jsx` collect `experience`, `salaryMin`, `salaryMax`, `benefits`, `deadline`, `openings` — but `job.controller.js`'s `createJob`/`updateJob` only ever destructured `{title, description, requirements, jobType, category, salary, district, address, expiresAt}`. Every one of those six fields has been silently discarded on every job ever created:

- `experience` — never saved anywhere, no column exists.
- `salaryMin`/`salaryMax` — never saved; **also read by nine other frontend files** (`JobDetails.jsx`, `ApplyJob.jsx`, `ApplicationDetail.jsx`, `SavedJobs.jsx`, `FindJobs.jsx`, `JobDirectory.jsx`, public `Landing.jsx`) that all already assume these fields exist and show "Salary negotiable" as a fallback that has silently been the *only* outcome for every job, everywhere, since these were never populated.
- `benefits` — never saved.
- `deadline` — sent by the frontend, but the backend only had `expiresAt` (never actually set from the request either, since the field name didn't match) — `job.deadline` has always been `undefined` on every page that reads it (`JobDetails.jsx`, `ManageJobs.jsx`, `EditJob.jsx`, `SavedJobs.jsx`, `ApplicationDetail.jsx`).
- `openings` — never saved.

This is not a new feature request — it's the actual root cause behind several small "bugs" (missing deadline badges, missing salary display) that would have looked unrelated if fixed one at a time. Fixed at the source: the `Job` model.

## Other real gaps found

1. **`ManageJobs.jsx` can't distinguish a draft from a closed job.** Both are `isActive: false`; the UI shows "Closed" for both, which is misleading for a job that was never published. `Job` has no status concept beyond the boolean.
2. **Company profile silently drops `tagline`, `founded`, and `email`.** `CompanyProfile.jsx` collects and sends all three; `Company` has no `tagline`/`foundedYear` columns, and `updateProfile` never reads `email` from the body even though the column exists on `Company`... actually it doesn't — `Company` has no `email` column either. Confirmed via schema read.
3. **Company Settings page is entirely non-functional.** The password-change inputs have no `value`/`onChange` (not wired to any state), "Save Settings" just does local `setSaved(true)` with no API call at all, and "Delete Company Account" has no handler. This is exactly the "fake save-success behavior" the brief explicitly prohibits.
4. **`/api/user/change-password`, `/api/user/notifications`, `/api/user/account` are job-seeker-only** — the whole `user.routes.js` router is gated behind `requireRole('job_seeker')`, so even if the company Settings page *did* call them, it would get a `403`. The underlying controller functions are already role-agnostic (they only touch `req.user.id`).
5. **`updateNotifications` (job-seeker side too) is a no-op stub** — `res.json({message: 'Notification settings updated', settings: req.body})` — it echoes back whatever was sent without persisting anything. No `notificationPreferences` field exists on `User` to persist to.
6. **No notification management endpoints exist at all.** Phase 4 added the `Notification` model and a write-only `notificationService.js` (used internally by the verification workflow) — there is no `GET /api/notifications`, no mark-read, no mark-all-read, no delete, and no frontend notification bell/dropdown consumes any of it.
7. **Application status changes never create a notification.** `updateApplicationStatus` updates the row and returns — the applicant is never told their application moved.
8. **`deleteJob` has no protection for jobs with applications.** It hard-deletes unconditionally, which would cascade-delete every `Application` row for that job (`onDelete: Cascade` in the schema) — silently destroying applicant history.
9. **Job publish/close/reopen are one generic `toggle-status` endpoint**, not the three semantically distinct actions the brief wants (though functionally the restriction — verified-only publish — already works from Phase 4's `job.controller.js` change).

## What's already correct and complete (verified, not assumed)

- `company.controller.js`'s `getDashboardStats` and `getAnalytics` already use real Prisma aggregation — no mock/random data anywhere. `Dashboard.jsx` and `Analytics.jsx` already have proper loading/error/retry/empty states, and neither fabricates trend percentages (`change={0}` is explicit, not computed from fake data) or divides by zero (`Analytics.jsx`'s `maxApps` guard).
- `Applicants.jsx`/`getCompanyApplications` (hardened across Phase 1) already normalizes responses safely, paginates, filters by status/search, and never crashes on missing optional data.
- `Billing.jsx` (Phase 1) already shows a safe Free-plan/no-history state with no fake transactions.
- Company ownership checks already exist on every job/applicant/dashboard/analytics query (`prisma.company.findUnique({where:{userId: req.user.id}})` pattern, consistently applied) — verified by reading every company-scoped controller function, not assumed.
- The verified-company publish restriction itself (Phase 4) already works correctly server-side.
- **Interview scheduling does not exist anywhere in this codebase** — no model, no fields, no UI, no route. Per the brief's own instruction ("If the project does not contain interview functionality... do not invent it"), this phase does not add it. Documented here as explicitly out of scope, not silently skipped.

## Target architecture

- Extend `Job` with the six missing fields (`experience`, `salaryMin`, `salaryMax`, `benefits`, `openings`, and renaming `expiresAt`→`deadline` since nothing outside `job.controller.js` itself ever referenced `expiresAt`, while ten+ files already expect `deadline`).
- Add a `JobStatus` enum (`DRAFT`, `ACTIVE`, `CLOSED`) as the authoritative status; keep `isActive` in sync as a derived convenience field so every existing public-listing query (`where: { isActive: true }`, used in ~8 places) keeps working unchanged. `EXPIRED` is computed at read/apply time from `deadline < now()`, not stored — there's no scheduler in this project to flip a stored value, and the *behavior* (block new applications past the deadline) doesn't need one.
- Add `Company.tagline`/`foundedYear`/`email` (all already collected by the frontend, just never persisted).
- Add `User.notificationPreferences Json?` so the settings toggle can actually persist instead of faking success.
- Move `change-password`/`notifications`/`account` off the job-seeker-only router section so any authenticated role can use them (no duplicate controller/route needed — they already operate generically on `req.user.id`).
- Build real notification-management endpoints (`GET /api/notifications`, mark-read, mark-all-read, delete) and a frontend service + bell/dropdown.
- Wire `updateApplicationStatus` to create a notification.
- Guard `deleteJob`: block hard delete when applications exist, return a clear message instead.

## Company route map (post-Phase-5)

```
GET    /api/company/profile              (existing)
PUT    /api/company/profile              (existing, extended fields)
POST   /api/company/logo                 (existing)
GET    /api/company/dashboard            (existing, extended metrics)
GET    /api/company/analytics            (existing, minor additions)
GET    /api/company/billing/history      (existing, unchanged)
GET    /api/company/subscription         (existing, unchanged)
POST   /api/user/change-password         (moved out of job-seeker-only gate)
PUT    /api/user/notifications           (moved out of job-seeker-only gate, now persists)
DELETE /api/user/account                 (moved out of job-seeker-only gate)

GET    /api/jobs/my                      (existing)
POST   /api/jobs                         (extended fields, draft/publish rules)
PUT    /api/jobs/:id                     (extended fields)
DELETE /api/jobs/:id                     (now blocks when applications exist)
PATCH  /api/jobs/:id/toggle-status       (existing, verified-only-to-activate rule from Phase 4)

GET    /api/applications/company         (existing, unchanged)
PATCH  /api/applications/:id/status      (existing, now creates a notification)

GET    /api/notifications                (new)
PATCH  /api/notifications/:id/read       (new)
PATCH  /api/notifications/read-all       (new)
DELETE /api/notifications/:id            (new)
```

## Company role permissions (unchanged, re-verified)

Every company-scoped query resolves the company via `prisma.company.findUnique({ where: { userId: req.user.id } })` — never from a client-supplied `companyId`. Cross-company access was already impossible before this phase (verified by reading every handler, not assumed) and remains so.

---

## Resolution (post-implementation)

Every gap listed above was fixed and live-verified against a running server before being called done — including one bug this process itself caught: the dashboard's post-transition company refetch and the job-creation default-status logic both needed a second pass after the first live test run exposed real discrepancies (see `PHASE_5_COMPLETION_REPORT.md` for specifics).

One deliberate API contract change worth calling out: `POST /api/jobs` used to take a boolean `isActive` (silently ignored in practice, since nothing ever sent it correctly). It now takes an explicit `status: 'DRAFT' | 'ACTIVE'`, defaulting to `'ACTIVE'` when omitted (matching how job boards normally behave — a job is live unless you explicitly ask to save it as a draft), with the existing verified-company gate blocking the request server-side if that would result in `ACTIVE` for an unverified company. This surfaced as a real regression against Phase 4's own test suite during this phase's work — caught, root-caused, and fixed rather than silently changing the test to match broken behavior.

See `PHASE_5_COMPLETION_REPORT.md` for the full file-by-file accounting, live verification transcript, and commit-plan outcome.
