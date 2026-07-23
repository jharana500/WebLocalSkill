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

## Jobs — verification restrictions (Phase 4)

`POST /api/jobs` now accepts an optional `isActive` in the body (previously ignored — new jobs always published immediately). An unverified company (any `verificationStatus` other than `VERIFIED`) may still create a job, but:

- `isActive: false` or omitted → created as a draft, `201`.
- `isActive: true` while unverified → `403` `"Your company must be verified before publishing jobs."`, nothing is created.

`PATCH /api/jobs/:id/toggle-status` returns the same `403` when the toggle would *activate* a job (`isActive: false → true`) for an unverified company; deactivating is always allowed.
