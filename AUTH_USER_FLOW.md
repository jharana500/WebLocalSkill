# LocalSkill Authentication & User Flow

## Token lifecycle

- Backend issues a JWT (`jsonwebtoken`) on register/login, signed with `process.env.JWT_SECRET`, containing `{ userId }`, expiring per `JWT_EXPIRES_IN` (default `7d`).
- Frontend stores `{ user, token, isAuthenticated }` via Zustand's `persist` middleware under the `localStorage` key `auth-storage` (`frontend/src/store/authStore.js`). This is the single storage strategy — no other component reads `localStorage` directly.
- Every request attaches `Authorization: Bearer <token>` via the Axios request interceptor (`frontend/src/services/api.js`).
- Backend's `authenticate` middleware (`backend/src/middleware/auth.js`) verifies the JWT, loads the user (`id, email, role, isActive`), and rejects deactivated/deleted users. On a missing header it returns 401 `"Authentication required"`; on an invalid/expired token it returns 401 `"Session expired. Please log in again."`.

## Session persistence (new this phase)

Previously the app trusted whatever was in `localStorage` with no server-side check — a session that had expired or been revoked server-side would still render as "logged in" until the user hit some unrelated API call that happened to 401. This phase added real validation:

1. On app boot, `App.jsx` calls `authStore.initializeAuth()` once.
2. If no token is stored, initialization completes immediately and the user is logged out.
3. If a token is stored, `GET /api/auth/me` is called. Success re-hydrates `user` from the server's response (the source of truth, not the possibly-stale cached copy). Failure (expired/invalid token, deactivated/deleted user) clears the stored session.
4. While this check is in flight, `App.jsx` renders a full-page loading spinner instead of the router — no protected content, no login-page flicker, no dashboard flash for an about-to-be-rejected session.

## Backend auth response contract

All `/api/auth/*` endpoints respond through `sendSuccess`/`sendError` (`backend/src/utils/response.js`):

```json
// success
{ "success": true, "message": "...", "data": { ... } }
// error
{ "success": false, "message": "...", "errors": [] }
```

The `user` object returned by `register`, `login`, and `GET /api/auth/me` is now standardized (previously login/register only returned `{id, email, role}`, and the frontend read fields — `user.name`, `user.avatar`, `user.company.logo` — that the backend never sent):

```json
{
  "id": "user-id",
  "fullName": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "job_seeker",
  "avatarUrl": null,
  "company": { "id": "...", "name": "...", "logoUrl": null, "isVerified": false, "status": "ACTIVE", "plan": "FREE" }
}
```

`company` is only present for company-role users. `fullName` is derived server-side from `JobSeekerProfile.firstName/lastName`, falling back to `Company.name`, falling back to the email. `avatarUrl` comes from `profile.avatarUrl` or `company.logoUrl`. The password hash is never selected into this payload.

Roles are stored uppercase in Postgres (`JOB_SEEKER`, `COMPANY`, `ADMIN` — the Prisma `Role` enum) but always returned to the frontend lowercased (`job_seeker`, `company`, `admin`), matching the convention the frontend already used everywhere. Public registration only accepts `job_seeker`/`company` — `admin` is rejected with 400, there is no invitation-flow admin signup in this phase.

## Role matrix

| Role (frontend) | Dashboard | Notes |
|---|---|---|
| `job_seeker` (alias `worker`) | `/dashboard` | |
| `company` (alias `employer`) | `/company/dashboard` | |
| `admin` | `/admin/dashboard` | Not registerable via public form |

Centralized in `frontend/src/utils/roles.js` (`normalizeRole`, `getRoleDashboardPath`) and consumed by `ProtectedRoute`, `GuestRoute`, `PublicLayout`'s navbar, `useLogin`'s post-login redirect, and `JobDetails.jsx`'s job-seeker check — previously each of these duplicated its own if/else chain, and one of them (`JobDetails.jsx`) compared against the wrong case (`'JOB_SEEKER'` instead of `'job_seeker'`), which silently broke the apply/save-job gating for every logged-in job seeker. Backend-side role matching (`backend/src/middleware/role.js`) was already centralized and unaffected by this — it remains the authoritative check; frontend guards are UX only.

## Route matrix

| Path | Guard | Behavior |
|---|---|---|
| `/login`, `/register`, `/register/role` | `GuestRoute` | Redirects to role dashboard if already authenticated |
| `/forgot-password`, `/reset-password` | none | Accessible regardless of auth state |
| `/dashboard/*` | `ProtectedRoute role="job_seeker"` | |
| `/company/*` | `ProtectedRoute role="company"` | |
| `/admin/*` | `ProtectedRoute role="admin"` | |

`ProtectedRoute` behavior: unauthenticated → redirect to `/login` (preserving `location` in route state); authenticated with the wrong role → redirect to that user's own dashboard (no blank/403 page — matches the existing pattern already in the codebase); authenticated with an unrecognized role → logged out and sent to `/login` rather than looping.

## Forgot / reset password (new this phase)

Previously both pages were placeholder UI — `ForgotPassword.jsx`/`ResetPassword.jsx` used `setTimeout` and never called the backend; `POST /api/auth/reset-password` returned a hardcoded `501 Not implemented`. This phase implemented the full flow:

1. **`POST /api/auth/forgot-password`** — always returns `200` with the same neutral message (`"If an account exists for this email, reset instructions have been sent."`) whether or not the email is registered. If the account exists and is active, a cryptographically random 32-byte token (`crypto.randomBytes`) is generated; only its SHA-256 hash is stored (`PasswordReset.tokenHash`, new Prisma model), with a 30-minute expiry. Any previous unused token for that user is deleted first, so only one reset link is live at a time. In development, the raw reset URL is logged server-side (`console.log`) since no email service is configured; nothing sensitive is ever returned in the API response, in development or production.
2. **`POST /api/auth/reset-password`** — takes `{ token, password, confirmPassword }`. The provided token is hashed and looked up; if missing, already used, or expired, it returns `400 "The reset link is invalid or has expired."` (same message for all three cases — no information about *why* it failed). On success, the password is hashed with bcrypt and the token is marked used, both inside one `prisma.$transaction`.
3. Frontend `ResetPassword.jsx` now reads `token` from the URL query string, shows an explicit "invalid reset link" state if it's missing entirely (no crash), and surfaces the backend's error message on failure instead of always showing success.

## Password policy

Shared server-side via `backend/src/utils/validation.js` (`isValidPassword`, `PASSWORD_REQUIREMENTS`): minimum 8 characters, at least one letter, at least one number. Enforced on register, reset-password, and change-password (`user.controller.js`) — previously only the frontend's Zod schema (`min(8)`) gated password strength, so the backend would accept any password submitted directly to the API.

## Logout

`useLogout()` (`frontend/src/hooks/useAuth.js`) is the single logout path — it calls `authStore.logout()` (clears `user`/`token`/`isAuthenticated` and removes the `auth-storage` key from `localStorage`), navigates to `/`, and shows a toast. All four layouts (job seeker, company, admin, and their mobile menus) call this same hook rather than clearing state themselves.

## Axios 401/403 handling

Unchanged from Phase 1, re-verified this phase: a `401` from a protected endpoint clears the session and navigates to `/login` via `history.pushState`/`popstate` (no full reload, no loop); a `401` from `/auth/login`, `/auth/register`, or while already on an auth page is returned to the caller instead of triggering global logout; a `403` shows a toast without touching the session.
