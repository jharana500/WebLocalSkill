# Phase 3 Completion Report — Resume Builder Persistence & PDF Export

Branch: `feature/resume-builder-pdf` (from `feature/auth-session-userflow`, so it sits on top of Phase 1 + Phase 2 as this phase's brief assumes)

## Summary

Unlike the "known bugs" framing in the brief, the Resume Builder's persistence and PDF export were **already built correctly**: real Prisma-backed save/load (not `localStorage`), and a proper isolated `@react-pdf/renderer` document with no DOM capture, no `window.print()`, no dashboard chrome, and no broken dash characters. A live-generated test PDF and byte-level checks confirmed this rather than assuming it from a code read. The real work this phase was closing gaps a fresh audit surfaced: an unhandled resume-load failure, a whole Projects/Certifications section that the backend and PDF template already supported but the form UI never exposed, non-clickable portfolio/project/credential links, and array-index React keys on the dynamic entry lists.

## Files inspected

Every file in the Phase 3.1 checklist, read in full: `ResumeBuilder.jsx`, `ResumePDFDocument.jsx`, `resumeService.js`, `resume.routes.js`, `resume.controller.js`, `schema.prisma`'s `Resume` model, plus a whole-frontend grep for `window.print()`, `html2canvas`, `jsPDF`, `document.body`, `querySelector`, `resumeRef`/`componentRef`, and resume data in `localStorage`.

## Resume Builder root causes

1. **Silent load failure** — `useQuery`'s `isError` was never read; a backend-down page load looked identical to "no resume yet," with no retry.
2. **Projects/Certifications were dead on arrival** — the Prisma model, the save/load normalization, and `ResumePDFDocument.jsx`'s rendering all already supported `projects`/`certifications`, but the form had no tab to ever populate them, so those PDF sections could never show real content.
3. **Array-index React keys** on experience/education `.map()` calls — functionally harmless today (fully controlled inputs, no uncontrolled per-item children) but the exact anti-pattern the brief calls out, and a latent risk if the cards ever grow local state.
4. **Links were inert plain text** — portfolio/project/credential URLs rendered as unclickable text in both the live preview and the PDF, and weren't normalized (`linkedin.com/in/x` stayed exactly that instead of becoming a working `https://` link).

## PDF root cause

**There wasn't one.** See the new section at the top of `BUG_FIX_REPORT.md` for the full investigation — the brief's described symptoms (sidebar/navbar/browser-chrome in the PDF, `2022 � Present`) do not reproduce anywhere in this codebase. `@react-pdf/renderer` was already the sole PDF dependency, already used correctly via an isolated `Document`/`Page` tree, and the date-range separator was already a plain ASCII hyphen, confirmed at the byte level (`0x2d`).

## Files modified

- `backend/src/controllers/resume.controller.js` — string trimming (capped 5,000 chars), array-size capping (50 items), `personalData` object-shape validation, response message text aligned to the brief's exact copy, new `deleteMyResume`.
- `backend/src/routes/resume.routes.js` — added `DELETE /me`.
- `frontend/src/pages/jobseeker/ResumeBuilder.jsx` — load-error state + retry, stable `id`s on every dynamic entry, two new tabs (Projects, Certifications) following the existing Experience/Education pattern, portfolio link normalization, aligned toast/message copy to the brief.
- `frontend/src/pages/jobseeker/ResumePDFDocument.jsx` — shared `formatDateRange`, clickable `<Link>` for portfolio/project/credential URLs, renders the new project (`technologies`, `link`) and certification (`issueDate`, `credentialUrl`) fields.
- `frontend/src/services/resumeService.js` — added `deleteResume()`.
- `frontend/src/utils/formatters.js` — new shared `formatDateRange()` and `normalizeUrl()` helpers, replacing two near-duplicate implementations that previously lived separately in the preview and the PDF.

## Files created

- `backend/test/resume.test.js` — 9 tests.
- `RESUME_BUILDER_FLOW.md`, this file, and the additions to `API_CONTRACT.md`/`BUG_FIX_REPORT.md`.

## Prisma changes

**None.** `schema.prisma`'s existing `Resume` model already matched the brief's suggested shape field-for-field (`title`, `summary`, `personalData`, `experience`, `education`, `skills`, `projects`, `certifications` as JSON columns, `userId @unique` for one-resume-per-user). `npx prisma format`/`validate`/`generate` all ran clean; no migration was created because none was needed.

## Backend resume endpoints

```
GET    /api/resumes/me   — auth required; { resume: null } for a new user
POST   /api/resumes/me   — auth required; upsert, ownership from req.user.id
PATCH  /api/resumes/me   — alias of POST (existing behavior, unchanged)
DELETE /api/resumes/me   — new this phase; safe no-op if nothing to delete
```

Full request/response shapes documented in `API_CONTRACT.md`.

## Frontend persistence changes

Load/save/upsert flow was already sound (a `dataLoaded` guard already prevented a post-save query-invalidation refetch from clobbering in-progress typing — verified by reading, not rebuilt). What changed: load failures now surface an error state with retry instead of failing silently; every dynamic array entry gets a stable `id` at creation time and a backfilled one (`withIds()`) when loading older saved data that predates this change, so removing an entry mid-list can no longer cause key-reuse.

## PDF implementation used

**`@react-pdf/renderer`, unchanged** — already the correct choice and already correctly isolated from the DOM/dashboard. Extended (not replaced) to render the new Projects/Certifications fields and clickable links.

## Build results

```
backend:  npx prisma format/validate/generate → all clean, no migration
backend:  npm test → 34/34 passing (9 new resume tests, 25 carried over from Phase 1/2)
frontend: npm run build → succeeded (same pre-existing ResumeBuilder chunk-size
                           warning as Phase 1/2, out of scope — the chunk grew
                           slightly with the new tabs, still just a size warning)
```

Test data (`phase3-resume-*@test.local` accounts and their resumes) created and deleted within the test run; verified 0 leftover rows after.

## Test results

`backend/test/resume.test.js` (9 tests): unauthenticated access blocked, new-user safe-null response, create, update-without-duplicating (upsert verified via a direct row-count check), cross-user isolation (user B never sees user A's resume), malformed non-array sections normalized to `[]` instead of crashing, invalid email rejected, delete scoped to the caller only (verified user A's resume survives user B's delete).

No frontend test runner exists in this project (same situation as Phase 1/2) — frontend-only behaviors (stable keys preventing input-focus loss on removal, the load-error retry UI, live preview updating from the same state as the form, PDF filename sanitization, the "missing full name blocks download" guard) were verified by code review plus the live PDF-generation script described below, consistent with how Phase 1/2 documented this same limitation.

## Manual verification

Live-generated an actual PDF via `@react-pdf/renderer`'s `pdf().toBuffer()`, loading the real `ResumePDFDocument.jsx` through Vite's `ssrLoadModule` (not a reimplementation), with a deliberately long 6-role/long-description resume:

| # | Test | Result |
|---|---|---|
| 1 | New user | Code-verified: default state renders, `getMyResume()` returns `{resume:null}`, form seeds only the email |
| 2 | Complete personal data | Code-verified: preview reads the same `data` object as the form, no duplicate state |
| 3 | Add experience | Code-verified: stable `id` assigned via `makeId()`, current-role checkbox disables End Date, `formatDateRange` renders correctly |
| 4 | Add education/skills, remove | Code-verified: removal filters by array position but keys are now `id`-based, so removing a middle entry can't cause a stale-input bug |
| 5 | Save Draft | Live: `POST /api/resumes/me` verified via automated test, returns `200` with the saved resume |
| 6 | Refresh (reload) | Code-verified: `dataLoaded` guard means a real page refresh re-runs the load effect fresh from `GET /api/resumes/me` |
| 7 | Download PDF | **Live-verified**: generated PDF contains only resume content — no sidebar/navbar/URL/footer, since the PDF tree has no reference to any of them |
| 8 | Long resume | **Live-verified**: 6 experience entries with long descriptions produced a valid 2-page PDF (page count confirmed via `/Type /Page` object count in the raw PDF bytes) — no clipped text, no blank pages |
| 9 | Broken date case | **Live-verified at the byte level**: `formatDateRange('2022-01', '', true)` → `"2022-01 - Present"`, hex-dumped and confirmed `0x2d` (ASCII hyphen) — the `2022 �Present` failure mode is not reproducible |
| 10 | Empty optional sections | Code-verified: every section in both the preview and the PDF is conditionally rendered only when real data exists |
| 11 | Backend unavailable | Code-verified: new `isError` branch shows `"Could not load your saved resume"` + Retry; save failure shows `"Could not save your resume. Please try again."` and preserves form data (mutation failure doesn't touch local state) |
| 12 | PDF generation error | Code-verified: `handleDownloadPdf`'s `try/catch` shows a toast and resets `isGeneratingPdf` in `finally`, so the button always re-enables |

## Remaining limitations

- No browser-driven (Playwright/Cypress) verification — same documented limitation as every prior phase.
- No frontend unit-test runner exists in this project, so frontend-only logic (React state, not backend contracts) is verified by code review rather than automated assertions — consistent with Phases 1 and 2.
- Skills remain a single comma-separated text field rather than individual add/remove chip entries. This was a deliberate choice, not an oversight: the existing design already works safely and converts correctly on both ends, and rebuilding it as a chip UI would be an unrequested redesign of working UI, which the brief explicitly prohibits.
- `DELETE /api/resumes/me` has no frontend UI trigger yet (no "delete my resume" button exists in the design) — added for API completeness per the brief's endpoint list, not because a UI gap was found.

## Commit plan outcome

Four of the eleven planned commits were skipped, each because either there was genuinely nothing to build, or because the change they'd contain isn't practically separable from a bigger single-file commit without risky manual reconstruction of intermediate file states.

| # | Planned commit | Outcome |
|---|---|---|
| 1 | audit resume builder and export workflow | Applied — `RESUME_BUILDER_FLOW.md` |
| 2 | normalize resume builder form state | Skipped — the stable-ID/helper work only exists as part of the single `ResumeBuilder.jsx` change committed under #5; that file's diff also contains #4's and #9's content, and splitting one file's diff across four commits isn't practical without reconstructing intermediate versions from memory, which risks introducing a subtle bug at a commit that's never actually tested |
| 3 | persist resume draft with prisma | Applied — `resume.controller.js`, `resume.routes.js` |
| 4 | load and synchronize saved resume data | Applied, narrower than planned — `resumeService.js`'s new `deleteResume()`. The load-error-handling UI itself is bundled into #5 for the same file-splitting reason as #2 |
| 5 | stabilize resume sections and live preview | Applied — `ResumeBuilder.jsx` (stable IDs, load-error state, Projects/Certifications tabs, live preview updates) + `utils/formatters.js` (needed by the preview) |
| 6 | add dedicated professional resume pdf document | Skipped — this already existed, already isolated, already A4, before this phase; there was no dedicated component left to create. See `BUG_FIX_REPORT.md` |
| 7 | remove dashboard elements from pdf export | Skipped — audited and confirmed no dashboard/browser-chrome elements were ever present in the export; nothing to remove. See `BUG_FIX_REPORT.md` |
| 8 | improve resume date and text formatting | Applied — `ResumePDFDocument.jsx` (shared `formatDateRange`, clickable links, new project/certification fields) |
| 9 | add resume save and export feedback states | Skipped — loading states, disabled buttons, and toasts already existed; this round's message-copy alignment and the filename-fallback fix are part of #5's `ResumeBuilder.jsx` commit for the same reason as #2 |
| 10 | cover resume persistence and pdf workflow | Applied — `backend/test/resume.test.js`, 9 tests |
| 11 | document phase three resume workflow | Applied — this file, plus updates to `RESUME_BUILDER_FLOW.md`, `API_CONTRACT.md`, `BUG_FIX_REPORT.md` |

## Recommended next phase

Company-side candidate resume viewing (the company Applicants/CandidateProfile pages already reference `resumeUrl`/`resume` fields from earlier phases — worth auditing whether they can render or link to the same resume data this phase now persists reliably), or addressing the pre-existing `ResumeBuilder` bundle-size warning via route-level code splitting.
