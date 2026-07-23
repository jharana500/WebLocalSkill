# Resume Builder — Data Flow & Export Audit

## Audit method

Read every file in the Phase 3.1 checklist end-to-end (not excerpts) and searched the whole frontend for the legacy-PDF patterns the phase brief warns about (`window.print()`, `html2canvas`, `jsPDF`, `document.body` capture, `querySelector`, `resumeRef`/`componentRef`, resume data in `localStorage`). Findings below reflect the actual code as of this audit, not the brief's assumed starting state.

## Current data flow

1. `frontend/src/pages/jobseeker/ResumeBuilder.jsx` holds one flat `data` object in local state (`name, title, email, phone, location, portfolio, summary, experience[], education[], skills, projects[], certifications[]`) — `skills` is a comma-separated string in form state, converted to/from an array at the load/save boundary.
2. On mount, `useQuery(['resume','me'], resumeService.getMyResume)` fetches `GET /api/resumes/me`. A one-time effect (guarded by a `dataLoaded` flag, so a later query-invalidation refetch after Save can't clobber in-progress typing) merges the server response into local state, or seeds just the email from the auth store for a brand-new user.
3. Save Draft calls `POST /api/resumes/me` (`resumeService.saveResume`) via `toResumePayload()`, which filters out fully-empty experience/education entries and converts the skills string back to an array.
4. Backend `resume.controller.js` normalizes the payload (arrays coerced to `[]` if not arrays, skills string split on comma) and `prisma.resume.upsert()`s it keyed on `req.user.id` — ownership is entirely server-derived, no client-supplied user ID is trusted anywhere.
5. The live preview (`ResumePreview`, inline in `ResumeBuilder.jsx`) renders from the *same* `data` state as the form — there is no separate/duplicate preview copy to fall out of sync.

## Current export flow

**This was already built correctly and does not match the brief's assumed failure mode.** `handleDownloadPdf()` calls `@react-pdf/renderer`'s `pdf(<ResumePDFDocument data={...} />).toBlob()` — a fully isolated PDF document tree (`frontend/src/pages/jobseeker/ResumePDFDocument.jsx`, `Document`/`Page size="A4"`/`View`/`Text` from `@react-pdf/renderer`) that has no reference to the dashboard, sidebar, DOM, or browser chrome at all. There is no `window.print()`, no `html2canvas`, no `jsPDF`, no `document.body` DOM capture (the one `document.body.appendChild(link)` call is the standard temporary-anchor trick to trigger a blob download, not a page capture), no `resumeRef`/`componentRef`, and no resume data cached in `localStorage`. Date ranges already use a plain ASCII hyphen (`' - '`), not an en-dash — grepped both resume files for U+2013/U+2014/U+FFFD and found none.

**Conclusion:** the specific symptoms listed in Phase 3.2 (sidebar/navbar in PDF, browser URL/footer, broken `2022 � Present` dash) do not reproduce in this codebase. This phase's job is therefore to close the *real* gaps found during the audit below, not to re-architect a working export pipeline.

## Bugs / gaps actually found

| # | Gap | Where | Impact |
|---|---|---|---|
| 1 | Resume load failure is silently swallowed | `ResumeBuilder.jsx` — only `isLoading` is checked, `isError` is never read | Backend-down on page load looks identical to "no resume yet"; no retry path |
| 2 | Projects/Certifications have no editor UI | `ResumeBuilder.jsx` tabs are Personal/Experience/Education/Skills/Preview only | Backend model and `ResumePDFDocument.jsx` both fully support `projects`/`certifications`, but a user can never populate them — those PDF sections are permanently dead |
| 3 | Dynamic array entries keyed by array index | `experience.map((exp,i) => <div key={i}>)`, same for education | Works today (fully controlled inputs, no per-item local state) but is the exact anti-pattern Phase 3.6 calls out; risks input-focus bugs if entries are ever given uncontrolled children |
| 4 | Portfolio/website link isn't normalized or clickable in the PDF | `ResumePDFDocument.jsx` renders `data.portfolio` as plain `<Text>` | A user typing `linkedin.com/in/x` gets inert text in the exported PDF instead of a working link |
| 5 | Backend doesn't trim strings or validate `personalData` is actually an object | `resume.controller.js normalizeResumePayload()` | Minor correctness gap vs. Phase 3.5's stated rules |
| 6 | Backend success messages don't match the brief's specified copy | `getMyResume`/`saveMyResume` use `"Resume loaded"`/`"Resume draft saved"` instead of `"Resume fetched successfully"`/`"Resume draft saved successfully"` | Cosmetic only, aligned for consistency with Phase 1/2's response-contract work |
| 7 | No `DELETE /api/resumes/me` | Not implemented | Listed as a "preferred" (not mandatory) endpoint; no frontend UI needs it, added for API completeness |
| 8 | No automated tests for resume persistence/ownership | No `backend/test/resume.test.js` | Same gap pattern as pre-Phase-1/2 — no regression coverage |

## Target architecture (this phase)

- Keep the existing single-flat-object form state design (it already satisfies "one predictable structure, no duplicate preview state, no per-tab state resets") — add stable `id`s to dynamic array entries rather than restructuring state.
- Keep `@react-pdf/renderer` as the sole PDF strategy — it already satisfies Phase 3.11's preference (isolated from the DOM, professional A4 output, automatic multi-page flow) and there is no reason to introduce `html2canvas`/`jsPDF` alongside it.
- Extend the existing Experience/Education tab pattern to Projects and Certifications rather than inventing a new UI pattern.
- Keep the existing Prisma `Resume` model exactly as-is — see below.

## Prisma model (no change needed)

`schema.prisma`'s existing `Resume` model already matches the brief's suggested shape field-for-field:

```prisma
model Resume {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title          String?
  summary        String?
  personalData   Json?
  experience     Json?
  education      Json?
  skills         Json?
  projects       Json?
  certifications Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("resumes")
}
```

One resume per user (`userId @unique`), JSON columns for the flexible sections — no migration required for this phase.

## Backend endpoints (existing, kept)

```
GET   /api/resumes/me   — auth required, returns { resume: null } for a new user
POST  /api/resumes/me   — auth required, upserts (create-or-update) keyed on req.user.id
PATCH /api/resumes/me   — auth required, currently aliased to the same upsert handler as POST
```

`DELETE /api/resumes/me` is added this phase for completeness (see gap #7).

## PDF strategy selected

**`@react-pdf/renderer`, unchanged** — already the right choice per Phase 3.11 and already correctly implemented as an isolated document tree. Effort this phase goes into closing gaps #2–#4 above (projects/certifications sections actually reachable, stable keys, clickable links) rather than switching libraries.
