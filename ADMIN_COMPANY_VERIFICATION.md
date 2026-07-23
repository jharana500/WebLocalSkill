# Admin Company Verification & Duplicate Review — Audit & Design

## Audit method

Read every file in the Phase 4.1 checklist end-to-end, plus grepped the whole codebase for `isVerified`, `verificationStatus`, `registrationNumber`, `panNumber`, `duplicate`, `notification`, `publish job`. Findings reflect the actual code, not the brief's assumed starting state — this phase's premise ("no admin review exists yet") turned out to be only half true: a real, partially-working review workflow already exists.

## Current company registration flow

`POST /api/auth/register` (role `company`) creates a `Company` row (`name`, `userId`) with `isVerified: false`, `status: ACTIVE` (an *account-standing* flag — active/suspended/pending-payment, unrelated to identity verification). The company later visits `/company/verification` (`frontend/src/pages/company/Verification.jsx`) to submit PAN number, a business registration number, and two documents (PAN certificate, registration certificate) via `POST /api/company/verification` (multipart), which upserts a **separate** `CompanyVerification` row (one-to-one with `Company`).

## Current verification support (already exists)

- **Schema**: `CompanyVerification` model (`panNumber`, `panDocumentUrl`, `registrationCertUrl`, `status: VerificationStatus`, `reviewNotes`, `reviewedAt`, `submittedAt`) and `enum VerificationStatus { PENDING, UNDER_REVIEW, APPROVED, REJECTED }` — no `DUPLICATE` value, no duplicate-tracking fields, no `reviewedById` (records *when* reviewed, never *who*).
- **Backend**: `GET /api/admin/verification-queue`, `POST /api/admin/verification/:id/review` (`admin.controller.js`'s `getVerificationQueue`/`reviewVerification`) — a working admin/company-verification decision endpoint (`APPROVED`/`REJECTED`/`UNDER_REVIEW`) that already correctly flips `Company.isVerified = true` on `APPROVED`.
- **Frontend**: `/admin/verification` (`VerificationQueue.jsx`) — a functional master-detail review UI (list + Approve/Reject/Mark Under Review panel), already wired to the endpoints above.
- **Job restriction**: `job.controller.js`'s `createJob` already blocks unverified companies with `403 "Company must be verified to post jobs"`.
- **Verified badge**: `VerifiedBadge` (`components/ui/Badge.jsx`) is a pure presentational component, already conditionally rendered off `company.isVerified` in `AdminCompanies.jsx`, `CompanyDetails.jsx` (admin), `JobDetails.jsx`, job cards, etc.

## Missing fields / real bugs found

1. **`registrationNumber` is silently dropped.** `Verification.jsx`'s submit form already sends `form.append('registrationNumber', regNumber)`, but `company.controller.js`'s `submitVerification` never reads `req.body.registrationNumber` and `CompanyVerification` has no column for it — the value the company owner types is thrown away today.
2. **No `reviewedById`** — only `reviewedAt`. No record of *which* admin made a decision.
3. **No duplicate detection at all** — no normalized name, no scoring, no match reasons, no `duplicateOfCompanyId`.
4. **No admin audit log model.**
5. **No `Notification` model.** Nothing in the schema or backend persists notifications; the "notification" hits in a repo-wide grep are all unrelated user *settings* toggles (`user.controller.js`'s `updateNotifications` is a no-op stub that doesn't persist anything).
6. **`AdminCompanyDetails.jsx`'s "Approve Verification"/"Revoke Verification" button is broken.** It calls `adminService.updateCompanyStatus(id, company.isVerified ? 'REJECTED' : 'APPROVED')` → `PATCH /api/admin/companies/:id/status`, but that endpoint's backend only accepts `['ACTIVE', 'SUSPENDED', 'PENDING']` (the *account-standing* enum, a completely different field from verification) — sending `'APPROVED'`/`'REJECTED'` always fails validation with `400`. This button has never worked.
7. **`isVerified` isn't cleared on re-review.** `reviewVerification` sets `Company.isVerified = true` on `APPROVED` but never sets it back to `false` on a later `REJECTED`/re-review — a company approved once and later rejected would incorrectly keep its verified badge.
8. **`createJob` blocks unverified companies from creating *any* job**, including drafts — stricter than this phase's target rules, which want unverified companies to still be able to save draft jobs, just not publish/activate them. There is currently no way to create a job as a draft at all (the endpoint doesn't even accept an `isActive` field, and the schema defaults new jobs to `isActive: true`).

## Target architecture (this phase)

Extend the **existing** `CompanyVerification` model and the **existing** `/api/admin/companies/:id` route family — do not create a second, parallel verification data model or a second admin company list page. Specifically:

- `VerificationStatus` enum: rename `APPROVED` → `VERIFIED` (zero existing rows use it — confirmed via a live DB query before making this change) and add `DUPLICATE`.
- `CompanyVerification` gains: `registrationNumber`, `reviewedById` (+ `User` relation), `duplicateOfCompanyId` (+ `Company` relation). `reviewNotes` is reused as the single reason/notes field for every decision type (verify/reject/duplicate/restore) rather than adding a redundant `rejectionReason` column.
- `Company` gains: `normalizedName` (computed, stored separately from `name`).
- New `AdminAuditLog` model (none existed).
- New `Notification` model (none existed).
- **Retire** `GET /api/admin/verification-queue` and `POST /api/admin/verification/:id/review` in favor of the brief's `companies/:id/...` route family, operating on `Company.id` (which `getCompanies`/`getCompanyById` already use) instead of `CompanyVerification.id` — this avoids the "duplicate route styles" the brief explicitly warns against. `VerificationQueue.jsx` is upgraded in place (same route, same nav entry) to call the new endpoints and gain tabs, duplicate-risk badges, and a comparison view. `AdminCompanyDetails.jsx`'s broken button is replaced with working verify/reject/mark-duplicate/restore actions.
- `job.controller.js`: `createJob` relaxed to allow draft creation (`isActive: false`) for unverified companies, only blocking an attempt to publish (`isActive: true`); `toggleJobStatus` blocks *activating* a job for an unverified company.

## Duplicate detection rules (implemented this phase)

See `backend/src/services/companyDuplicateService.js` for the authoritative implementation. Summary:

- **High-confidence** (large score contributions): exact registration number, exact PAN number, exact website domain, exact normalized-name + same location.
- **Medium-confidence**: exact normalized name alone, exact phone, exact owner email domain, same owner account, strong name similarity, same location + similar name.
- **Low-confidence / explicitly excluded**: same city alone, same industry alone, or shared generic words (e.g. "Tech", "Solutions", "Nepal", "Services") never contribute to a match — the brief explicitly forbids flagging on these alone, and the similarity scorer strips them before comparing.
- Risk score 0–100, capped; LOW (0–39) / MEDIUM (40–69) / HIGH (70–100). The admin always makes the final call — nothing is auto-marked duplicate from a score alone.

## Company restrictions (this phase)

| Status | Dashboard/profile | Draft jobs | Publish/activate jobs | Verified badge | Public verified listings |
|---|---|---|---|---|---|
| PENDING / UNDER_REVIEW / REJECTED / DUPLICATE | ✅ | ✅ | ❌ (403) | ❌ | ❌ |
| VERIFIED | ✅ | ✅ | ✅ | ✅ | ✅ |

Enforced server-side in `job.controller.js` (`createJob`, `toggleJobStatus`) — never trusting a frontend-only check.

## API routes (this phase)

```
GET   /api/admin/companies                       (existing, kept)
GET   /api/admin/companies/:id                    (existing, extended response)
PATCH /api/admin/companies/:id/status              (existing, kept — account standing, unrelated to verification)
GET   /api/admin/companies/:id/duplicate-check     (new)
PATCH /api/admin/companies/:id/under-review        (new)
PATCH /api/admin/companies/:id/verify              (new)
PATCH /api/admin/companies/:id/reject              (new)
PATCH /api/admin/companies/:id/mark-duplicate      (new)
PATCH /api/admin/companies/:id/restore             (new)
GET   /api/admin/companies/:id/audit-log           (new)
```

Removed: `GET /api/admin/verification-queue`, `POST /api/admin/verification/:id/review` (superseded, see above).

## Status transitions (enforced server-side)

```
PENDING       -> UNDER_REVIEW, VERIFIED, REJECTED, DUPLICATE
UNDER_REVIEW  -> VERIFIED, REJECTED, DUPLICATE
REJECTED      -> UNDER_REVIEW, VERIFIED
DUPLICATE     -> UNDER_REVIEW, PENDING, VERIFIED
VERIFIED      -> UNDER_REVIEW
```

A same-status transition (e.g. `VERIFIED` → `VERIFIED`) is rejected with a readable `400` rather than silently creating a no-op audit entry.

---

## Resolution (post-implementation)

Everything above was implemented as designed, with two adjustments discovered during live testing (not just code review — every endpoint was exercised against a running server and a real Postgres database before being called done):

1. **`getCompanyById`'s post-transition refetch initially omitted `duplicateOfCompany`.** Caught live: marking a company DUPLICATE returned a response where `verification.duplicateOfCompany` was `undefined` even though the database write succeeded. Fixed by adding it to the refetch's `include`.
2. **Duplicate-check test data hygiene**: an "unrelated company" test case initially failed because every test account in this suite shares the `@test.local` email domain, which the detector correctly treats as a (weak, LOW-risk) signal — that's the algorithm working as designed, not a bug. Fixed by giving the "genuinely unrelated" test company a distinct email domain rather than weakening the detector.

Live-verified end-to-end with real accounts (two companies registered as near-duplicates of each other, "Local Skill Pvt. Ltd." and "LocalSkill Private Limited"): duplicate-check correctly found the match (`MEDIUM` risk, name similarity + owner email domain), the full transition chain (`PENDING → UNDER_REVIEW → VERIFIED`, `PENDING → UNDER_REVIEW → DUPLICATE → PENDING`) worked exactly per the table above, self-reference and circular-duplicate guards both blocked correctly, and `Company.isVerified` flipped `true`/`false` in lockstep with every transition — including on `REJECTED`, closing gap #7 from the audit (previously `isVerified` was never cleared on re-review).

See `PHASE_4_COMPLETION_REPORT.md` for the full commit-by-commit accounting and test results.
