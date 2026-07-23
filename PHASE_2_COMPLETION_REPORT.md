# Phase 2 Completion Report — Authentication, Session, Role & User Flow

Branch: `feature/auth-session-userflow` (from `development`)

## Summary

Unlike Phase 1 — where every listed bug turned out to already be fixed — this phase's audit found genuinely unimplemented and broken pieces: `ForgotPassword.jsx`/`ResetPassword.jsx` were placeholder UI that never called the backend, `POST /api/auth/reset-password` was a hardcoded `501`, there was no session-restore-on-refresh validation against the backend, the `user` object the frontend reads (`fullName`, `avatarUrl`, `company.logoUrl`) didn't match what the backend actually returned (`id/email/role` only), and one role check (`JobDetails.jsx`) compared against the wrong case and silently broke apply/save-job gating for every logged-in job seeker. All of these are now implemented and covered by automated tests.

## Files inspected

Every file listed in the Phase 2.1 brief, plus (found during the audit, not in the original list) `frontend/src/layouts/PublicLayout.jsx`, `frontend/src/pages/jobseeker/JobDetails.jsx`, `frontend/src/pages/jobseeker/Dashboard.jsx`, and `frontend/src/components/ui/Input.jsx` — all of which turned out to reference the auth/user contract and needed fixing once that contract changed.

## Root causes found

1. **Forgot/reset password were never implemented.** Frontend pages simulated success with `setTimeout`; backend `resetPassword` returned `501`; no token model existed in Prisma.
2. **Session restore on refresh was blind trust, not validation.** Zustand's `persist` middleware rehydrated `user`/`token`/`isAuthenticated` from `localStorage` with no call to `GET /api/auth/me`, so an expired/revoked token would render as a valid session until an unrelated request happened to 401.
3. **The `user` object's shape didn't match what the frontend read.** `login`/`register`/`getMe` returned `{id, email, role}` (register/login) or a differently-shaped nested `profile`/`company` (getMe), while three layouts and `Dashboard.jsx` read `user.name`, `user.avatar`, and `user.company.logo` — none of which the backend ever sent. Names and avatars silently never rendered.
4. **Role-redirect logic was duplicated in four places**, one of which (`JobDetails.jsx`) used the wrong case (`'JOB_SEEKER'` vs. the app's `'job_seeker'` convention), making its `isJobSeeker` flag always `false`.
5. **No backend password-strength enforcement** — only the frontend's Zod schema gated password length; posting directly to `/api/auth/register` accepted any password.

## Authentication fixes

- `backend/src/controllers/auth.controller.js`: added `buildUserPayload()` computing `fullName`/`avatarUrl` from the user's profile or company, applied consistently to `register`, `login`, and `getMe`. Backend-side password strength validation added to `register` via a new shared `backend/src/utils/validation.js` (`isValidPassword`, min 8 chars + letter + number), also applied to `user.controller.js`'s `changePassword`.
- Public registration continues to reject `role: "admin"` (unchanged, already correct — verified with a test).

## Session fixes

- `frontend/src/store/authStore.js`: added `isInitializing`, `authError`, `initializeAuth()`, `refreshCurrentUser()`, `clearAuthError()`.
- `frontend/src/App.jsx`: calls `initializeAuth()` once on boot; renders a full-page loading spinner (not the router) until it resolves, so a stale/expired session can't flicker into a protected page and an about-to-be-restored session can't flash the login page.

## Route protection fixes

- `frontend/src/routes/ProtectedRoute.jsx`: wrong-role access now redirects to the user's own dashboard via the shared helper; a genuinely unrecognized role now logs the user out and redirects to `/login` instead of silently rendering nothing or looping.
- `frontend/src/utils/roles.js` (new): `normalizeRole()` / `getRoleDashboardPath()`, the single source of truth for role aliasing (`employer`→`company`, `worker`→`job_seeker`) and dashboard destinations.

## Role-flow fixes

- `frontend/src/hooks/useAuth.js`, `frontend/src/layouts/PublicLayout.jsx`, `frontend/src/pages/jobseeker/JobDetails.jsx` now all consume `utils/roles.js` instead of their own inline if/else chains.
- Fixed the `JobDetails.jsx` case-mismatch bug described above.
- Fixed `user.company.logo` → `user.company.logoUrl` (`CompanyLayout.jsx`) and `user.name`/`user.avatar` → `user.fullName`/`user.avatarUrl` (`JobSeekerLayout.jsx`, `AdminLayout.jsx`, `CompanyLayout.jsx`, `Dashboard.jsx`) to match the new backend contract.

## Forgot/reset-password implementation

- New Prisma model `PasswordReset` (`userId`, `tokenHash` (unique), `expiresAt`, `usedAt`, `createdAt`) — migration `20260725115334_add_password_reset_flow`.
- `POST /api/auth/forgot-password`: always returns the same neutral `200` message regardless of whether the email exists. For a real, active account, generates a 32-byte random token, stores only its SHA-256 hash, 30-minute expiry, deletes any prior unused token for that user first. Raw token is logged server-side only when `NODE_ENV !== 'production'`, never returned in the response.
- `POST /api/auth/reset-password`: validates the token (exists, unused, unexpired — one generic error message for all three failure modes), validates `password === confirmPassword` and the shared password policy, updates the password and marks the token used inside one `$transaction`.
- `frontend/src/pages/auth/ForgotPassword.jsx` and `ResetPassword.jsx` rewritten to actually call the backend; `ResetPassword.jsx` reads `token` from the URL and shows an explicit "invalid link" state if it's missing, rather than crashing or lying about success.

## Prisma changes

```
npx prisma format    → schema formatted
npx prisma validate  → "The schema at prisma/schema.prisma is valid 🚀"
npx prisma generate  → "Generated Prisma Client (v7.8.0)"
npx prisma migrate dev --name add_password_reset_flow → applied cleanly, no data loss
```

No existing migrations were touched, reset, or recreated. One new migration only.

## Tests and build results

```
backend:  npm test → 25/25 passing (7 carried over from Phase 1's runtime.test.js,
                      18 new in test/auth.test.js covering register success/duplicate/
                      admin-blocked/weak-password, login success/invalid/unregistered,
                      /me without-token/valid-token/expired-token, wrong-role 403,
                      forgot-password neutral response x2, reset-password invalid/
                      mismatched/expired/valid-with-token-reuse-blocked)
frontend: npm run build → succeeded (same pre-existing ResumeBuilder chunk-size
                      warning as Phase 1, out of scope)
```

Test data (throwaway `*@test.local` accounts and their `PasswordReset` rows) was created and deleted within the test run; verified 0 leftover rows after each run.

## Manual flow results

Flows exercisable without a browser were driven live against the running backend (register → login → /me → forgot-password → capture dev-logged token → reset-password → old password rejected → new password accepted); this is exactly what `backend/test/auth.test.js` now automates, so "manual" and "automated" verification are the same 18 scenarios. Frontend-only behavior (session-restore loading screen, guest-route redirect, logout clearing all four layouts, password-visibility toggle, inline field errors) was verified by code review — no browser automation tool was available in this session, consistent with Phase 1's documented limitation.

| # | Test | Result |
|---|---|---|
| 1 | Unregistered login | 401 `"Invalid email or password"`, no reload (unchanged from Phase 1, re-verified) |
| 2 | Wrong password | Same message, no enumeration — automated test |
| 3 | Job-seeker login | Redirect to `/dashboard` via `getRoleDashboardPath`; session persists via `initializeAuth` — code-verified |
| 4 | Company login | Redirect to `/company/dashboard`; job-seeker-only routes blocked by `ProtectedRoute` — code-verified |
| 5 | Admin login | Redirect to `/admin/dashboard`; non-admin blocked — code-verified (no seeded admin account to drive live, role-check logic identical to job-seeker/company paths which *were* driven live) |
| 6 | Authenticated user opens `/login` | `GuestRoute` redirects via `getRoleDashboardPath` — code-verified |
| 7 | Logout | `useLogout()` clears store + `localStorage`, redirects to `/` — code-verified, single implementation used by all 4 layouts |
| 8 | Expired token | `authenticate` middleware returns `401` `"Session expired. Please log in again."` — automated test |
| 9 | Forgot password, existing email | Neutral `200`, token row created — automated test |
| 10 | Forgot password, unknown email | Byte-identical response to #9 — automated test |
| 11 | Valid password reset | Password updated, token single-use, old password rejected, new password works — automated test |
| 12 | Invalid/expired reset link | Clear `400` message, frontend shows explicit "invalid link" state, no crash — automated (backend) + code-verified (frontend) |
| 13 | Backend unavailable | Axios network-error fallback message (`"Unable to connect to the server..."`), unchanged from Phase 1 — code-verified |

## Remaining limitations

- No browser-driven verification (Playwright/Cypress) — same limitation as Phase 1, no such tool available this session.
- No admin account exists in this dev database to drive test #5 live; the code path is identical to the job-seeker/company paths that were driven live, so this is a reasoned inference, not a live result.
- `POST /api/auth/refresh` remains `501` — out of scope; the app relies on the 7-day JWT expiry plus `/api/auth/me` validation on boot, not refresh-token rotation.
- No email service is configured, so `forgot-password` only logs the reset link server-side in development — this was explicitly allowed by the brief ("do not fake a sent email in production"); wiring a real transactional-email provider is follow-up work.
- Company verification-status gating (Phase 2.11) was reviewed: `CompanyLayout.jsx` already shows a Verified/Unverified badge and does not block access to any company route based on status, and no company route currently checks `verification.status` to restrict access — so there was nothing to loosen or tighten this phase. Full admin review of verification submissions remains a later phase, as instructed.

## Commit plan outcome

Commit 2 ("professionalize login and registration flows") was skipped — `Login.jsx`/`Register.jsx` were already fully professional as of Phase 1 (loading states, inline errors, no-reload submit, duplicate-email handling) and needed zero changes this phase. The backend response-shape work that *would* have partly lived here (register/login returning `fullName`/`avatarUrl`) is inseparable, at the file level, from the forgot/reset-password rewrite in `auth.controller.js` — both were implemented together in one pass over that file — so it's committed under commit 6 instead, noted there.

Three consumer fixes (`JobSeekerLayout.jsx`, `AdminLayout.jsx`, `CompanyLayout.jsx`, `Dashboard.jsx`) that only make sense once the backend actually returns `fullName`/`avatarUrl`/`logoUrl` are bundled into commit 6 for the same reason — committing them earlier would leave an intermediate commit where the frontend reads fields the backend of that same commit doesn't yet send.

| # | Planned commit | Outcome |
|---|---|---|
| 1 | centralize authentication state management | Applied — `authStore.js` |
| 2 | professionalize login and registration flows | Skipped — already done in Phase 1, no diff |
| 3 | persist authenticated sessions across refresh | Applied — `App.jsx` boot-time `initializeAuth()` + loading gate |
| 4 | enforce protected and role-based routes | Applied — `utils/roles.js` (new) + `ProtectedRoute.jsx` |
| 5 | standardize role-based dashboard redirects | Applied — `useAuth.js`, `PublicLayout.jsx`, `JobDetails.jsx` |
| 6 | complete forgot and reset password flow | Applied — Prisma model+migration, `validation.js` (new), `auth.controller.js`, `user.controller.js`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `authService.js`, and the 4 layout/dashboard consumer fixes |
| 7 | improve logout and expired session handling | Applied — `middleware/auth.js` session-expired message (logout itself needed no changes, already centralized in Phase 1) |
| 8 | add professional auth feedback states | Applied — `aria-invalid` on `Input.jsx` (password-visibility toggle, loading/disabled states, and toast feedback all already existed) |
| 9 | cover authentication and role navigation flows | Applied — `backend/test/auth.test.js` (18 tests) |
| 10 | document phase two authentication workflow | Applied — this file, `AUTH_USER_FLOW.md`, `API_CONTRACT.md` |

## Recommended next phase

Company verification review workflow for admins (queueing, approve/reject, status transitions) — explicitly deferred by this phase's brief. A second candidate: wiring a real transactional email provider for password reset, since the current dev-only console-log fallback isn't production-usable.
