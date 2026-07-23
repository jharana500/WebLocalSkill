# API Contract

Scope: `/api/auth/*` (Phase 2), `/api/resumes/*` (Phase 3), `/api/admin/companies/*` and the verification-related parts of `/api/jobs` (Phase 4). Other endpoint groups (`/api/applications`, `/api/billing`, etc.) are not yet documented here — this file is a starting point, not a full contract, and should be extended as later phases touch other routes.

All responses share the same envelope:

```json
// success
{ "success": true, "message": "string", "data": { ... } }
// error
{ "success": false, "message": "string", "errors": [] }
```

---

### `POST /api/auth/register`

Public. Body:

```json
{ "email": "string", "password": "string", "role": "job_seeker" | "company",
  "firstName": "string?", "lastName": "string?", "name": "string?", "companyName": "string?" }
```

- `role` other than `job_seeker`/`company` → `400`. Public registration cannot create an `admin` account.
- Password must be ≥8 chars with at least one letter and one number → `400` otherwise.
- Duplicate email → `409` `"An account with this email already exists"`.
- Success → `201` with `{ user, token }` (see user shape below).

### `POST /api/auth/login`

Public. Body: `{ "email": "string", "password": "string" }`

- Invalid email or password → `401` `"Invalid email or password"` (identical message either way — no account-existence disclosure).
- Success → `200` `"Login successful"` with `{ user, token }`.

### `POST /api/auth/logout`

Requires auth. No body. Always `200` `"Logged out successfully"` — logout is stateless server-side (JWTs aren't server-tracked in this phase); the frontend clears the local session.

### `GET /api/auth/me`

Requires auth (`Authorization: Bearer <token>`).

- Missing header → `401` `"Authentication required"`.
- Invalid/expired token or deactivated/deleted user → `401` `"Session expired. Please log in again."`.
- Success → `200` `"Current user fetched successfully"` with `{ user }`.

### `POST /api/auth/forgot-password`

Public. Body: `{ "email": "string" }`

- Always `200` with the same neutral message, regardless of whether the email is registered: `"If an account exists for this email, reset instructions have been sent."`
- If the account exists and is active, a reset token is generated behind the scenes (see `AUTH_USER_FLOW.md`). In development the raw reset URL is logged server-side; it is never included in the API response.

### `POST /api/auth/reset-password`

Public. Body: `{ "token": "string", "password": "string", "confirmPassword": "string" }`

- `password`/`confirmPassword` mismatch → `400` `"Passwords do not match"`.
- Password fails the shared policy → `400` with `PASSWORD_REQUIREMENTS` text.
- Token missing, already used, or expired → `400` `"The reset link is invalid or has expired."` (one message for all three cases).
- Success → `200` `"Password reset successfully. Please log in."` The token is single-use (marked `usedAt`) and the new password is hashed with bcrypt.

### `POST /api/auth/refresh`

Not implemented — returns `501`. Out of scope for this phase; sessions rely on the existing 7-day JWT expiry plus `GET /api/auth/me` validation on app boot rather than a refresh-token rotation scheme.

---

## `user` object shape (register / login / me)

```json
{
  "id": "cms09l8he0000xgd4e7qac2tn",
  "fullName": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "job_seeker",
  "avatarUrl": null,
  "company": null
}
```

`role` is always lowercase (`job_seeker` | `company` | `admin`), regardless of the uppercase Prisma enum stored in Postgres. `company` is present (with `id`, `name`, `logoUrl`, `isVerified`, `status`, `plan`) only for `role: "company"` users; otherwise the key is omitted. The password hash is never included.

---

## Resume

All `/api/resumes/*` endpoints require auth. Ownership is always derived from `req.user.id` — no endpoint accepts a client-supplied user/owner ID, and there is no way to read or write another user's resume. One resume per user (`Resume.userId` is `@unique` in the schema).

### `GET /api/resumes/me`

- No resume saved yet → `200` `{ "data": { "resume": null } }`.
- Resume exists → `200` `{ "data": { "resume": { "id", "title", "summary", "personalData", "experience", "education", "skills", "projects", "certifications", "createdAt", "updatedAt" } } }`.

### `POST /api/resumes/me` / `PATCH /api/resumes/me`

Both create-or-update (upsert) the caller's single resume — `PATCH` is an alias of the same handler as `POST`, matching how the frontend already calls it. Body is a flat or `personalData`-nested resume payload (either shape accepted; see `resume.controller.js`'s `normalizeResumePayload`).

- Non-array `experience`/`education`/`skills`/`projects`/`certifications` are silently normalized to `[]` rather than rejected.
- String fields are trimmed and capped at 5,000 characters; each array is capped at 50 items.
- `personalData.email`, if provided, must match a basic email pattern → `400` `"Enter a valid email address"` otherwise.
- Success → `200` `"Resume draft saved successfully"` with the saved `resume`.

### `DELETE /api/resumes/me`

Deletes the caller's resume if one exists; a safe no-op (still `200`) if not. No frontend UI calls this yet — added for API completeness per the Phase 3 brief's preferred endpoint list.

---

## Admin — Company Verification & Duplicate Review

All routes require auth + `ADMIN` role (`403` otherwise). Ownership/ID for every action is read from `req.params.id` (a `Company.id`) and `req.user.id` (the acting admin) — a company owner cannot call any of these, and cannot set `reviewedById`/`duplicateOfCompanyId`/verification status directly through their own profile endpoints.

### `GET /api/admin/companies`

Query params: `q` (searches name/industry/district/owner email/registration number/PAN), `status` (`CompanyStatus` — account standing), `plan`, `verificationStatus` (`VerificationStatus`), `duplicateRisk` (`LOW`|`MEDIUM`|`HIGH` — computes risk per company in the filtered set, so this is heavier than a plain list and bounded to 500 candidates), `page`, `limit` (max 100), `sortBy` (whitelisted: `createdAt`|`name`|`updatedAt`), `sortOrder`.

```json
{ "success": true, "message": "Companies fetched successfully",
  "data": { "companies": [], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } } }
```

### `GET /api/admin/companies/:id`

Returns `{ company, applicationCount, auditLog }` — `company` includes owner (safe fields only — no password/JWT), verification (with `reviewedBy` and `duplicateOfCompany`), recent jobs with application counts, and `duplicateFlaggedBy` (other companies pointing here). `auditLog` is the 20 most recent review actions for this company.

### `GET /api/admin/companies/:id/duplicate-check`

Runs `companyDuplicateService.analyzeDuplicateRisk()` live (nothing is cached/precomputed). Response shape:

```json
{ "success": true, "message": "Duplicate analysis completed",
  "data": {
    "company": { "id": "...", "name": "...", "details": { "...comparable fields for the UI comparison view" } },
    "riskLevel": "HIGH", "riskScore": 92,
    "matches": [ { "companyId": "...", "companyName": "...", "score": 92, "riskLevel": "HIGH", "reasons": [...], "details": {...} } ]
  } }
```

`matches` never includes the company itself, is sorted by score descending, and each match's `reasons` is a plain-English list (e.g. `"Registration number matches"`) — never a raw score breakdown. See `ADMIN_COMPANY_VERIFICATION.md` for the full scoring rules.

### `GET /api/admin/companies/:id/audit-log`

Standalone version of the `auditLog` array also embedded in the detail response, for when only the history is needed.

### `PATCH /api/admin/companies/:id/status`

Pre-existing, unrelated to verification — updates `CompanyStatus` (`ACTIVE`/`SUSPENDED`/`PENDING`), the account-standing field.

### `PATCH /api/admin/companies/:id/under-review`, `/verify`, `/reject`, `/mark-duplicate`, `/restore`

All five share one transition engine (`transitionCompanyVerification`) that, in a single `$transaction`: validates the status transition against the allowed-transitions table (`ADMIN_COMPANY_VERIFICATION.md`), upserts `CompanyVerification`, flips `Company.isVerified` (`true` only for `VERIFIED`), writes an `AdminAuditLog` row, and writes a `Notification` for the company owner. A same-status request (e.g. verifying an already-`VERIFIED` company) is rejected with `400` rather than silently no-op'ing.

- `/reject` requires `{ "reason": "..." }`, 5–1000 characters after trimming → `400` otherwise.
- `/mark-duplicate` requires `{ "duplicateOfCompanyId": "...", "reason": "..." }`. Rejects self-reference and direct circular references (`A` dup-of `B` while `B` is already dup-of `A`) with `400`.
- `/restore` accepts `{ "status": "PENDING" | "UNDER_REVIEW", "reason": "..." }` (defaults to `PENDING`); any other status is rejected.
- `/under-review` and `/verify` accept an optional `{ "reason": "..." }`.

Success response (all five):

```json
{ "success": true, "message": "Company verified successfully",
  "data": { "company": { "...", "isVerified": true, "verification": { "status": "VERIFIED", "reviewedBy": {...}, "duplicateOfCompany": null } } } }
```

Errors: `404` company not found, `400` invalid/no-op transition or validation failure, `403` non-admin.

---

## Jobs (Phase 4 restrictions superseded by Phase 5's `status` field — see below)

### `POST /api/jobs` / `PUT /api/jobs/:id`

Company role + ownership required (`PUT` only on jobs the caller's company owns — `404` otherwise, never `403`, to avoid confirming another company's job exists). Accepted fields: `title`, `description`, `requirements`, `benefits`, `jobType`, `experience`, `category`, `salary`, `salaryMin`, `salaryMax`, `openings`, `district`, `address`, `deadline`, and (create only) `status`.

- `status: 'DRAFT'` → always allowed, regardless of verification.
- `status: 'ACTIVE'` or omitted → defaults to publishing. If the company isn't `VERIFIED`, this is rejected with `403` `"Your company must be verified before publishing jobs."` and nothing is created — the caller must explicitly pass `status: 'DRAFT'` to save one while unverified.
- `salaryMin > salaryMax` → `400`.
- `PUT` never touches `status` — use the dedicated endpoints below. Omitted fields are left unchanged (no accidental overwrite with `undefined`).

### `PATCH /api/jobs/:id/publish`

Verified company only. `409` if already `ACTIVE`. `400` if the deadline has already passed, or if title/description/jobType/category are incomplete.

### `PATCH /api/jobs/:id/close`

Owning company only, any verification status. `409` if already `CLOSED`. Applications remain accessible after closing.

### `PATCH /api/jobs/:id/reopen`

Verified company only, job must currently be `CLOSED` (`409` otherwise). `400` if the deadline has already passed.

### `PATCH /api/jobs/:id/toggle-status`

Kept for the existing frontend action — delegates to publish/close/reopen based on the job's current status rather than duplicating the rules.

### `DELETE /api/jobs/:id`

Hard-deletes only if the job has zero applications. If it has any, returns `409` `"This job has applications and cannot be deleted. Close it instead to preserve applicant history."` — applicant history is never silently cascade-deleted.

### `GET /api/jobs/my`

Company's own jobs. Query: `status` (`DRAFT`|`ACTIVE`|`CLOSED`|`all`), `q` (title search), `page`, `limit` (max 100). Each job includes `applicationCount`, `pendingCount`, `shortlistedCount`, `acceptedCount`.

### Applying to a job (`POST /api/applications`)

Now also rejects with `400` `"The application deadline for this job has passed"` if the job's `deadline` is in the past — this is the "EXPIRED" behavior from Phase 5.7's status model; there's no separate stored `EXPIRED` enum value (no scheduler in this project to flip one), it's enforced at apply-time from `deadline < now()`.

---

## Application status (Phase 5)

`PATCH /api/applications/:id/status` now validates the transition against the existing `ApplicationStatus` enum (no new statuses added — no `INTERVIEW` status exists in this schema, see "Interview scheduling" below):

```
PENDING    -> REVIEWING, SHORTLISTED, REJECTED
REVIEWING  -> SHORTLISTED, REJECTED
SHORTLISTED -> HIRED, REJECTED
HIRED, REJECTED, WITHDRAWN -> (terminal)
```

An invalid transition (e.g. `SHORTLISTED` → `REVIEWING`) returns `409` with a readable message instead of silently applying it. Every successful transition creates a `Notification` for the applicant (type `APPLICATION_STATUS`) inside the same `$transaction` as the status update.

---

## Company dashboard (Phase 5)

### `GET /api/company/dashboard`

```json
{ "success": true, "message": "Company dashboard fetched successfully",
  "data": {
    "metrics": {
      "totalJobs": 0, "activeJobs": 0, "draftJobs": 0, "closedJobs": 0,
      "totalApplications": 0, "pendingApplications": 0, "shortlistedApplications": 0,
      "rejectedApplications": 0, "acceptedApplications": 0,
      "interviewsScheduled": 0,
      "unreadNotifications": 0, "profileCompletion": 0, "verificationStatus": "PENDING"
    },
    "recentApplications": [], "recentJobs": [],
    "applicationStatusDistribution": [], "applicationsOverTime": [],
    "topPerformingJobs": [], "recentActivity": []
  } }
```

`interviewsScheduled` is always `0` — there is no interview-scheduling feature in this project (see below), this is an honest constant, not a placeholder pretending data exists. `profileCompletion` is computed from 8 company-editable fields (`name`, `description`, `industry`, `email`, `phone`, `website`, `district`, `logoUrl`) — registration/PAN documents are tracked separately on the Verification page, not folded into this percentage. `recentActivity` is derived from real `Application`/`Job` rows (most recent 10, sorted by timestamp) — never fabricated.

### `GET /api/company/analytics?range=`

Existing `appTrend`/`jobPerformance`/`funnel`/`summary` unchanged, plus new `jobsByStatus` (array of `{status, count}`) and `averageApplicationsPerJob` (number, `0` when there are no jobs — never a division by zero).

---

## Company profile (Phase 5)

`PUT /api/company/profile` now also accepts `tagline`, `foundedYear`, `email` (previously collected by the frontend form and silently discarded). Validation: `email` must look like an email, `website` must look like a URL, `foundedYear` must be `1800`–current year, `description` ≤3000 chars, `tagline` ≤150 chars — all `400` with a readable message on failure. `isVerified`, `status` (`CompanyStatus`), `plan`, and every `CompanyVerification` field remain impossible to set through this endpoint — it only ever writes the fields explicitly listed here.

---

## Notifications (Phase 5 — endpoints new; the underlying model is from Phase 4)

```
GET    /api/notifications                  ?page=&limit=&unreadOnly=true
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/:id
```

All scoped to `req.user.id` — there is no way to read or modify another user's notifications. `GET` also returns `unreadCount` regardless of pagination, for a notification-bell badge.

---

## Account settings (Phase 5)

`POST /api/user/change-password`, `GET`/`PUT /api/user/notifications`, `DELETE /api/user/account` were previously gated behind `requireRole('job_seeker')` even though their controllers only ever touch `req.user.id` — a company user got `403` from all three. Moved out of that role gate; usable by any authenticated role. `PUT /api/user/notifications` now persists to `User.notificationPreferences` (a `Json?` column) instead of echoing the request body back without saving it.

---

## Interview scheduling — not applicable

No `Interview` model, fields, routes, or frontend UI exist anywhere in this codebase. Per the Phase 5 brief's own instruction not to invent functionality that isn't there, this was not added. `metrics.interviewsScheduled` above is hardcoded to `0` for this reason.
