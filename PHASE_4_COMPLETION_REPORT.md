# Phase 4 Completion Report — Admin Company Verification & Duplicate Review

Branch: `feature/admin-company-verification` (from `feature/resume-builder-pdf`, so it sits on top of Phases 1–3)

## Summary

This phase found a genuine mix: substantial working infrastructure already existed (a `CompanyVerification` model, a functional admin review queue, job-publish gating), alongside real, previously-shipped bugs (a completely broken "Approve Verification" button, a form field the backend silently discarded, a verified badge that never got un-set on re-review) and an entirely missing capability (duplicate detection, audit logging, notifications — none of which existed in any form). This phase extended the existing verification model rather than building a parallel one, replaced the broken pieces, and built duplicate detection, risk scoring, audit logging, and notifications from scratch.

## Root causes found

See `ADMIN_COMPANY_VERIFICATION.md` (audit) and the new section in `BUG_FIX_REPORT.md` for full detail. Summary: (1) `AdminCompanyDetails.jsx`'s verify/revoke button called an endpoint that only validates a completely different field, so it always failed; (2) `registrationNumber` was collected by the company verification form and silently dropped by the backend, never persisted; (3) `Company.isVerified` was set on approval but never cleared on a later rejection; (4) `createJob` blocked unverified companies from creating *any* job, including drafts, which was stricter than intended; (5) no duplicate detection, audit logging, or notification persistence existed at all.

## Files modified / created

**Schema**: `backend/prisma/schema.prisma` — `VerificationStatus` enum (`APPROVED`→`VERIFIED`, `+DUPLICATE`), `Company.normalizedName`/`phone`, `CompanyVerification.registrationNumber`/`reviewedById`/`duplicateOfCompanyId`, new `AdminAuditLog` and `Notification` models. Two migrations: `20260725130437_add_company_verification`, `20260725130604_add_company_phone`.

**Backend**: `services/companyDuplicateService.js` (new), `services/notificationService.js` (new), `services/auditLogService.js` (new), `controllers/admin.controller.js` (extended), `routes/admin.routes.js` (extended), `controllers/auth.controller.js` (normalize company name on register), `controllers/company.controller.js` (normalize on update, capture `registrationNumber`), `controllers/job.controller.js` (draft/publish restrictions), `test/company-verification.test.js` (new, 17 tests).

**Frontend**: `components/admin/CompanyReviewModal.jsx` (new), `components/admin/DuplicateComparisonView.jsx` (new), `pages/admin/VerificationQueue.jsx` (rewritten as the full dashboard), `pages/admin/CompanyDetails.jsx` (rewritten — broken button replaced, verification/duplicate/audit-history sections added), `pages/company/Verification.jsx` (VERIFIED/DUPLICATE terminology, resubmission allowed for more statuses), `services/adminService.js` (extended, no new parallel service file).

## Schema changes / migration

Both migrations generated via `prisma migrate diff` + applied via `prisma migrate deploy`, since this environment has no interactive TTY and `prisma migrate dev` refuses to run non-interactively here (same constraint hit in Phase 2). Each diff was reviewed before applying — the enum rename was confirmed safe by querying the live database first (zero existing `CompanyVerification` rows, so no data could reference the removed `APPROVED` value). No existing migrations were touched, reset, or recreated.

## Duplicate detection rules

`companyDuplicateService.js`: `normalizeCompanyName()` (lowercase, strips punctuation, strips `pvt`/`ltd`/`limited`/etc. suffixes), a dependency-free Levenshtein-based `nameSimilarity()` that excludes generic industry words (`tech`, `solutions`, `nepal`, `services`, ...) before comparing, and `analyzeDuplicateRisk()` which compares a company against every other company in the database on: exact registration number, exact PAN number, exact website domain, exact normalized name, exact phone, owner email domain, and name-similarity thresholds (high-similarity alone, or moderate-similarity + same location). Same-city-alone, same-industry-alone, and generic-word overlap never contribute to a score — verified via the "unrelated company" test case.

## Risk scoring

0–100, capped, per the brief's point values (registration/PAN exact: +50 each, normalized name exact: +35, domain exact: +30, phone/email-domain exact: +25 each, high name similarity: +20, similarity+location: +10). LOW `<40`, MEDIUM `40–69`, HIGH `≥70`. The admin always makes the final call — nothing is auto-marked duplicate from a score alone; the API only ever *reports* matches.

## Admin endpoints added

```
GET   /api/admin/companies?verificationStatus=&duplicateRisk=&sortBy=&sortOrder=...  (extended)
GET   /api/admin/companies/:id                    (extended response — owner, verification, audit log, application count)
GET   /api/admin/companies/:id/duplicate-check     (new)
GET   /api/admin/companies/:id/audit-log           (new)
PATCH /api/admin/companies/:id/under-review        (new)
PATCH /api/admin/companies/:id/verify              (new)
PATCH /api/admin/companies/:id/reject              (new)
PATCH /api/admin/companies/:id/mark-duplicate      (new)
PATCH /api/admin/companies/:id/restore             (new)
```

Removed `GET /api/admin/verification-queue` and `POST /api/admin/verification/:id/review` — superseded by the routes above, operating on `Company.id` consistently with the rest of the admin API rather than a second, parallel route style (the brief explicitly prohibits duplicate route styles). Full request/response contract in `API_CONTRACT.md`.

## Admin pages added

`/admin/verification` (`VerificationQueue.jsx`, existing route reused) — tabs for all five verification statuses, search, status badges, action dropdown, loading/error/empty states, pagination. `/admin/companies/:id` (`CompanyDetails.jsx`, existing route reused, shared with the general Companies list) — company/owner info, verification section with working action buttons, on-demand duplicate check with the side-by-side comparison view, review history, job listings. Both routes and the admin layout/sidebar already existed; no second admin layout was created.

## Company restrictions enforced

`job.controller.js`: `createJob` now accepts `isActive`; unverified companies can create drafts (`isActive: false`) but get `403 "Your company must be verified before publishing jobs."` if they request `isActive: true`. `toggleJobStatus` returns the same `403` when the toggle would activate a job for an unverified company; deactivating remains unrestricted. Both enforced server-side — the frontend was never trusted for this. Live-verified: an unverified test company could save a draft and was blocked from publishing/activating; the moment it was verified by the admin API, the identical publish request succeeded.

## Notifications implemented

`Notification` model (new — none existed before this phase, despite the brief assuming one did) + `notificationService.js`. A notification is created inside the same transaction as every verification decision (under-review, verified, rejected, duplicate, restored), with the exact copy specified in the brief. Live-verified via direct DB query after each transition.

## Audit logs implemented

`AdminAuditLog` model (new) + `auditLogService.js`. Every transition writes one entry with `adminId`, `action`, `entityType`/`entityId`, `oldValue`/`newValue` (JSON snapshots of `{status, isVerified}`), and `reason`, inside the same transaction as the status update and notification — Phase 4.31's requirement that these "succeed or fail together" is met by literally writing them in one `prisma.$transaction([...])` call, not by best-effort sequencing. Displayed as "Review History" on the company detail page.

## Build results

```
backend:  npx prisma format/validate/generate → clean, two migrations applied
backend:  npm test → 51/51 passing (17 new in company-verification.test.js,
                      34 carried over from Phases 1–3)
frontend: npm run build → succeeded (same pre-existing ResumeBuilder chunk-size
                      warning as prior phases, out of scope; CompanyDetails.jsx
                      grew from ~4KB to ~16KB reflecting the new content)
```

Test data was created and deleted within each test run; verified 0 leftover `*.test.local`/`*.unrelated-test.example` users, resumes, password-reset rows, audit logs, or notifications after the final run.

## Manual verification (live, not just automated)

Registered two real near-duplicate companies ("Local Skill Pvt. Ltd." / "LocalSkill Private Limited") against a running server before writing any automated test, to catch real bugs early:

| # | Test | Result |
|---|---|---|
| 1 | Pending company | Appears with `PENDING` status; `isVerified: false`; job publish blocked with `403` — live-verified |
| 2 | Duplicate check | Correctly found the near-duplicate pair (`MEDIUM` risk: name similarity + owner email domain), reasons listed, target excluded from its own matches — live-verified |
| 3 | Mark under review | Status updated, `reviewedById`/`reviewedAt` set, audit log + notification both persisted — live-verified via direct DB query |
| 4 | Verify | Status `VERIFIED`, `isVerified: true`, job publish then succeeded — live-verified |
| 5 | Reject | Reason required (`400` without one, confirmed), status `REJECTED`, `isVerified` cleared — live-verified |
| 6 | Mark duplicate | Target required, self-reference blocked (`400`), circular reference blocked (`400`), status `DUPLICATE`, `duplicateOfCompany` populated correctly (after fixing a refetch bug caught by this exact test) — live-verified |
| 7 | Restore | Returned to `PENDING`, `duplicateOfCompanyId` cleared, new audit entry created — live-verified |
| 8 | Non-admin access | `403` from every admin endpoint when called with a company-role token — live-verified; frontend route guards unchanged from Phase 2 (`ProtectedRoute role="admin"`) |
| 9 | Missing optional fields | Company detail page renders with `—` placeholders for absent registration/PAN/phone/website — code-verified (no browser tool available this session, consistent with every prior phase's documented limitation) |
| 10 | No duplicate matches | A company with a genuinely unrelated name and email domain returns `LOW` risk and an empty `matches` array, no crash — live-verified (also caught and fixed a test-data hygiene bug where leftover manual-testing accounts briefly caused a false positive) |

## Remaining limitations

- No browser-driven (Playwright/Cypress) verification — consistent limitation across all four phases.
- `duplicateRisk` list filtering computes risk for up to 500 candidates per request rather than being pre-indexed/cached — acceptable for this app's realistic scale (a handful to low hundreds of companies), called out in `API_CONTRACT.md` as a known cost, not swept under the rug.
- Notifications have no "mark as read" UI yet — the model supports `readAt`, but no frontend consumes it. Out of scope for this phase (the brief asked for persistence and creation, not an inbox UI).
- `AdminAuditLog.entityType` is always `"Company"` today — the model is generic enough to log other entity types in a later phase without a schema change.

## Commit plan outcome

Three of the twelve planned commits were skipped — in each case because the work is required, by the brief's own instructions, to happen atomically with an earlier commit (Phase 4.31: "audit-log creation, notification creation... should succeed or fail together"), making a later, separate commit for the same code artificial.

| # | Planned commit | Outcome |
|---|---|---|
| 1 | audit company verification and admin workflows | Applied — `ADMIN_COMPANY_VERIFICATION.md` |
| 2 | add company verification data model | Applied — schema + first migration |
| 3 | implement company duplicate detection service | Applied — `companyDuplicateService.js`, `Company.phone` + migration (needed for phone matching), `normalizeCompanyName` wired into register/profile-update, `registrationNumber` capture fix |
| 4 | add admin company review api | Applied — `admin.controller.js`/`admin.routes.js` plus `notificationService.js`/`auditLogService.js` (built together per Phase 4.31) |
| 5 | enforce company verification restrictions | Applied — `job.controller.js` draft/publish gating + company-side `Verification.jsx` status terminology |
| 6 | add admin company verification dashboard | Applied — `VerificationQueue.jsx` + `CompanyReviewModal.jsx` (the dashboard's action dropdown needs the modal to exist first) + `adminService.js` |
| 7 | add duplicate company comparison view | Applied — `DuplicateComparisonView.jsx` + `CompanyDetails.jsx` |
| 8 | add company review confirmations and feedback | Skipped — `CompanyReviewModal.jsx` (loading states, disabled-while-submitting, required-reason validation) had to exist before commit 6 could work at all; nothing distinct remains |
| 9 | notify company owners of review decisions | Skipped — `notificationService.js` had to be built alongside commit 4's transition engine, since every action creates its notification in the same transaction |
| 10 | record admin company review audit logs | Skipped — same reasoning as #9 for `auditLogService.js`; the audit-log *display* is part of commit 7's `CompanyDetails.jsx` |
| 11 | cover company verification and duplicate review | Applied — `company-verification.test.js`, 17 tests |
| 12 | document admin company verification flow | Applied — this file, `ADMIN_COMPANY_VERIFICATION.md` resolution section, `API_CONTRACT.md`, `DATABASE_SCHEMA.md` (new), `BUG_FIX_REPORT.md` |

## Recommended next phase

A notifications inbox UI (the model and data already exist — `readAt`, `type`, `data` — just no frontend consumer), or extending `duplicateRisk` filtering with a precomputed/cached score once the company count grows past what an on-demand scan handles comfortably.
