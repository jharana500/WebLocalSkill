# LocalSkill Bug Fix Report

## Verification Round — Runtime Stabilization Re-Audit

This round re-audited every bug listed in the Phase 1 runtime-stabilization brief against the actual code and a live backend/database, rather than assuming the previous round's fixes still held.

### Scope re-verified
- `backend/src/routes/application.routes.js`, `backend/src/controllers/application.controller.js`
- `backend/src/middleware/role.js`, `backend/src/middleware/auth.js`
- `backend/src/controllers/company.controller.js`, `backend/src/routes/company.routes.js`, `backend/src/routes/billing.routes.js`
- `backend/src/utils/response.js`, `backend/server.js`
- `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/prisma.config.js`, `backend/src/lib/prisma.js`
- `frontend/vite.config.js`, `frontend/src/services/api.js`, `frontend/src/services/applicationService.js`, `frontend/src/services/companyService.js`
- `frontend/src/pages/company/Applicants.jsx`, `frontend/src/pages/company/Billing.jsx`
- `frontend/src/pages/auth/Login.jsx`, `frontend/src/hooks/useAuth.js`, `frontend/src/store/authStore.js`, `frontend/src/routes/ProtectedRoute.jsx`
- `frontend/src/components/ErrorBoundary.jsx`, `frontend/src/main.jsx`

### Method
Rather than re-reading code in isolation, each bug was reproduced or disproved against a running backend (`node server.js`) and a live local PostgreSQL database, using a disposable test company account created and deleted for this purpose:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/applications/company?page=1&limit=10        # no token
curl -H "Authorization: Bearer <company token>" \
  http://localhost:5000/api/applications/company?page=1&limit=10           # company token
curl -H "Authorization: Bearer <job_seeker token>" \
  http://localhost:5000/api/applications/company?page=1&limit=10           # wrong role
curl -X POST http://localhost:5000/api/auth/login -d '{"email":"...","password":"wrong"}'
```

### Result

All 8 bugs listed in the Phase 1 brief were found **already fixed** by the previous debugging round (documented below in "Current Debugging Round"), and every fix still holds:

| Bug | Verified via | Result |
|---|---|---|
| `/api/applications/company` returns 500 | curl with/without token, with wrong role | Returns 401 (no token), 403 (wrong role), 200 with `{applications:[], pagination:{...}}` (empty company) — never 500 |
| `/company/billing` white screen | Code read of `Billing.jsx` + `GET /api/company/subscription` and `/api/company/billing/history` | Safe normalizers (`unwrapData`, `toArray`, `normalizeSubscription`) already in place; backend returns safe Free-plan/empty-history fallback |
| `/company/applicants` fails to load | Code read of `Applicants.jsx` + live API response | `getApplicationsPayload()` already normalizes multiple response shapes and guards `Array.isArray` |
| Frontend calls via `localhost:5173/api/...` | `vite.config.js` | Proxy already forwards `/api` → `http://localhost:5000` |
| Invalid login reloads the page | Code read of `Login.jsx` | Uses `react-hook-form` `handleSubmit`, no native form submit/reload |
| Pages crash on null/undefined/wrong-shaped API data | Code read of both pages | Both use optional chaining and array/type guards throughout |
| Backend errors return inconsistent JSON/HTML | curl to an unknown route and a 401 case | Both return `application/json`, never Express's default HTML error page |
| Missing loading/error/empty/retry states | Code read of both pages | Both implement all four states |

### Gap found and fixed this round

**No automated tests existed for any of the above.** Every verification in the previous round was manual/one-off, meaning a future regression would not be caught automatically. This round added `backend/test/runtime.test.js` (Node's built-in `node:test` runner, no new dependency) covering the exact scenarios above, and made `server.js` testable by exporting the Express `app` and guarding `app.listen()` behind `require.main === module` (so `node server.js` behaves identically, but tests can import `app` and bind an ephemeral port instead).

```bash
npm test
# 7 tests, 7 pass
```

While wiring this test up, `package.json`'s `test` script needed `node --test test/*.test.js` instead of `node --test test/` — the bare directory form failed to resolve in this environment. This is noted for anyone re-running it elsewhere.

No other code changes were required in this round because no other gap was found. See `PHASE_1_COMPLETION_REPORT.md` for the full commit-by-commit accounting, including which planned fix-commits were skipped and why.

---

## Current Debugging Round

### Scope inspected
- Frontend routing: `frontend/src/routes/index.jsx`
- Company pages: `frontend/src/pages/company/Billing.jsx`, `frontend/src/pages/company/Applicants.jsx`, `frontend/src/pages/company/CompanyProfile.jsx`
- API client/services: `frontend/src/services/api.js`, `frontend/src/services/applicationService.js`, `frontend/src/services/companyService.js`
- Vite proxy: `frontend/vite.config.js`
- Backend server/error handling: `backend/server.js`
- Application routes/controllers: `backend/src/routes/application.routes.js`, `backend/src/controllers/application.controller.js`
- Company billing handlers: `backend/src/routes/company.routes.js`, `backend/src/controllers/company.controller.js`
- Role middleware: `backend/src/middleware/role.js`
- Prisma schema relations: `backend/prisma/schema.prisma`

---

## Bug: `GET /api/applications/company?page=1&limit=10` returned 500

### Exact cause
`backend/src/routes/application.routes.js` declared the dynamic route `GET /:id` before the specific route `GET /company`.

Express matched this request:

```http
GET /api/applications/company?page=1&limit=10
```

as:

```http
GET /api/applications/:id
```

with `id = "company"`.

That sent the request to `getApplicationById`, which attempted to query an application by id `company`. This is the classic Express route-order bug and can produce backend errors or incorrect 404/500 behavior depending on downstream Prisma logic.

### Files affected
- `backend/src/routes/application.routes.js`
- `backend/src/controllers/application.controller.js`

### Fix applied
Specific routes now come before dynamic routes:

```js
router.get('/company', authenticate, requireRole('company', 'employer'), ctrl.getCompanyApplications)
router.get('/me', authenticate, requireRole('job_seeker'), ctrl.getMyApplications)
router.post('/', authenticate, requireRole('job_seeker'), ctrl.applyToJob)
router.get('/:id', authenticate, ctrl.getApplicationById)
router.patch('/:id/withdraw', authenticate, requireRole('job_seeker'), ctrl.withdrawApplication)
router.patch('/:id/status', authenticate, requireRole('company', 'employer'), ctrl.updateApplicationStatus)
```

`getCompanyApplications` was also rewritten defensively to:
- use the actual Prisma schema fields:
  - `Company.userId`
  - `Job.companyId`
  - `Application.userId`
  - `Application.jobId`
  - `Application.user`
  - `Application.job`
- support `req.user.id` and `req.user.userId`
- return `200` with an empty array when the company profile is missing or has no applicants
- include pagination safely
- include applicant profile/resume/job/company data without crashing if optional relations are missing
- log `GET_COMPANY_APPLICATIONS_ERROR:` only on real unexpected errors

### Expected response
Authenticated company users now receive:

```json
{
  "success": true,
  "message": "Company applications fetched successfully",
  "data": {
    "applications": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Unauthenticated requests correctly return clean JSON:

```json
{
  "success": false,
  "message": "Authentication required",
  "errors": []
}
```

---

## Bug: `/company/applicants` backend/API error and possible frontend crash

### Cause
The page depended on `GET /api/applications/company`, which was being intercepted by the dynamic backend route. The frontend also assumed a narrow response shape and could break if the backend returned wrapped data, an object instead of an array, missing applicant profile data, or an API error.

### Files affected
- `frontend/src/pages/company/Applicants.jsx`
- `frontend/src/services/applicationService.js`
- `backend/src/routes/application.routes.js`
- `backend/src/controllers/application.controller.js`

### Fix applied
`Applicants.jsx` now:
- normalizes wrapped and unwrapped responses
- safely handles:
  - `response.data.data.applications`
  - `response.data.applications`
  - direct unwrapped `applications`
- uses `normalizeApplication()` to avoid undefined access
- supports missing applicant/profile/job data
- shows loading skeletons
- shows a professional empty state
- shows an inline error panel with Retry if the API fails
- logs a focused debug message:

```js
console.error('COMPANY_APPLICATIONS_LOAD_ERROR:', error)
```

---

## Bug: `/company/billing` opened as a white blank page

### Exact cause
The billing history backend returned an object like:

```js
{ history: [], message: 'Billing integration not configured' }
```

The frontend did:

```js
const invoices = billingData?.invoices || billingData || []
```

When `billingData` was an object without `invoices`, `invoices` became that object. Later the component rendered:

```js
invoices.map(...)
```

Objects do not have `.map`, causing a React render crash and a white page.

### Files affected
- `frontend/src/pages/company/Billing.jsx`
- `backend/src/controllers/company.controller.js`
- `backend/src/routes/billing.routes.js`
- `backend/server.js`

### Fix applied
`Billing.jsx` now uses safe normalizers:

```js
unwrapData(res, fallback)
toArray(value)
normalizeSubscription(value)
```

The page now supports:
- loading state
- API error state
- retry button
- Free Plan / no active paid subscription defaults
- empty billing history state
- safe amount formatting via `Number(value || 0)`
- optional chaining for all subscription/invoice fields
- debug log:

```js
console.error('BILLING_LOAD_ERROR:', error)
```

Backend billing responses were also made safe and consistent:

```http
GET /api/company/subscription
GET /api/company/billing/history
GET /api/billing/subscription
GET /api/billing/history
GET /api/billing/plans
```

No new billing Prisma table was added because the current schema already stores plan information on `Company.plan`, and the requested fix only needs safe fallback data.

---

## Bug: Role middleware could reject valid users by casing/naming mismatch

### Cause
The middleware performed a simple lowercase comparison only. It did not support aliases like `employer` vs `company`, or role values with hyphens/spaces.

### File affected
- `backend/src/middleware/role.js`

### Fix applied
Role checks now normalize casing and separators and support aliases:
- `COMPANY` matches `company`
- `EMPLOYER` matches `employer` and company routes accepting employer
- `JOB_SEEKER` matches `job_seeker`
- `WORKER` can match `job_seeker` aliases where used

Forbidden response is now clean JSON:

```json
{
  "success": false,
  "message": "You are not authorized to access this resource",
  "errors": []
}
```

---

## Backend global error handling

### Files affected
- `backend/server.js`

### Fix applied
The global error handler now translates common Prisma errors:
- `P2002` duplicate key → `409`
- `P2025` record not found → `404`
- `PrismaClientValidationError` → `400`

All errors return JSON through the existing standardized response helper. Full errors are logged to the backend console in development/test smoke runs, but stack traces are not exposed as production JSON.

---

## Vite proxy / API base URL

### Files affected
- `frontend/vite.config.js`
- `frontend/src/services/api.js`

### Findings
The frontend request to:

```text
http://localhost:5173/api/applications/company?page=1&limit=10
```

is expected when using the Vite dev proxy.

### Fix applied
The Vite proxy is explicit and forwards `/api` to the backend:

```js
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

The Axios client also supports direct backend calls using:

```js
baseURL: import.meta.env.VITE_API_URL || '/api'
```

The 401 handler now clears auth and navigates using browser history/popstate instead of forcing a full page reload.

---

## Crash protection added

### Files affected
- `frontend/src/components/ErrorBoundary.jsx`
- `frontend/src/main.jsx`

### Fix applied
Added a React Error Boundary around the app. If any page still has a render-time crash, users now see a professional fallback UI instead of a totally white page.

Fallback includes:
- `Something went wrong`
- reload button
- development-only error message

---

## Validation performed

### Backend
```bash
npm --prefix backend install
npm --prefix backend run db:generate
node -c backend/server.js
node -c backend/src/controllers/application.controller.js
node -c backend/src/controllers/company.controller.js
node -c backend/src/routes/application.routes.js
node -c backend/src/routes/billing.routes.js
node -c backend/src/middleware/role.js
npm --prefix backend run dev
```

Backend dev server started on port `5000` before the timeout stopped the long-running watcher.

Endpoint smoke test without token:

```bash
GET /api/applications/company?page=1&limit=10
```

Returned expected clean JSON `401`, not HTML and not 500.

### Frontend
```bash
npm --prefix frontend install
npm --prefix frontend run build
npm --prefix frontend run dev
```

Frontend production build completed successfully.

Vite dev server started. Port `5173` was already in use, so Vite served on `5174` during smoke test.

### Diagnostics
Project diagnostics show no new blocking errors. Remaining diagnostics are existing warnings only:
- `frontend/src/pages/company/PostJob.jsx`
- `frontend/src/pages/jobseeker/Dashboard.jsx`
- `frontend/src/components/ui/Toast.jsx`
- `frontend/src/pages/company/Billing.jsx`

---

## Manual testing checklist

1. Visit `/company/billing`
   - Page should load.
   - No white blank screen.
   - Free Plan / current plan appears.
   - Billing history empty state appears if no invoices exist.
   - Retry/error state appears if backend is unreachable.

2. Visit `/company/applicants`
   - Page should load.
   - Loading state appears during request.
   - Applicants list appears if data exists.
   - Empty state appears if no applicants exist.
   - Error state with Retry appears if API fails.
   - No `.map is not a function` crash.

3. Visit `/api/applications/company?page=1&limit=10`
   - Without token: clean `401` JSON.
   - With company token: `200` JSON with applications and pagination.
   - With wrong role: clean `403` JSON.

4. Browser console
   - No uncaught React render crash.
   - No `Cannot read properties of undefined`.
   - No `.map is not a function`.

5. Network tab
   - `/api/applications/company` no longer routes to `/:id`.
   - Billing endpoints return safe JSON.
