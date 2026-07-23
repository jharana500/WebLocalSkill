# API Contract

Scope: `/api/auth/*` (Phase 2) and `/api/resumes/*` (Phase 3). Other endpoint groups (`/api/company`, `/api/applications`, `/api/billing`, etc.) are not yet documented here — this file is a starting point, not a full contract, and should be extended as later phases touch other routes.

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
