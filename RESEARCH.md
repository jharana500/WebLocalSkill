# Research & Design Rationale

## Problem background

Nepal's job-seeking landscape is fragmented across informal channels — social media groups, word of mouth, and listing sites with little to no verification of the employers posting on them. Job seekers have limited ways to confirm that a posting company is a legitimate, registered business before applying or sharing personal information, and employers have no lightweight way to signal legitimacy beyond claims on their own listing. LocalSkill's starting premise is narrow and deliberately scoped: a direct job marketplace where company identity is verified by a human admin before a company can publish live listings, rather than a fully automated trust system.

## Target users

- **Job seekers** — building a profile, browsing verified-company listings, applying directly, and tracking application status without needing to go through a recruiter or agency.
- **Companies** (mostly small and medium employers) — posting jobs, reviewing applicants, and managing a hiring pipeline through a lightweight dashboard, without needing enterprise ATS software.
- **Admins** — a small, trusted operator group responsible for reviewing company verification submissions and catching duplicate/fraudulent company registrations before they can publish.

## Why admin-gated verification instead of automated trust scoring

Fully automated verification (e.g., trusting whatever registration number a company types in, or auto-approving based on a score threshold) was rejected early: a duplicate-detection or document-matching algorithm can flag risk, but it cannot authoritatively confirm a business registration is genuine without a live registry integration, which is out of scope for this project. The design instead treats the algorithm as a decision aid for a human: `companyDuplicateService.analyzeDuplicateRisk()` produces a risk score and plain-English reasons (e.g., "Registration number matches"), but every state transition — verify, reject, mark duplicate, restore — is a deliberate admin action, logged to an append-only audit trail (`AdminAuditLog`) with the reviewing admin's identity attached. This keeps a human accountable for every verification decision while still surfacing the signal that would otherwise require manually cross-referencing every new registration against every existing one.

## Duplicate-detection approach

The scoring model was designed to avoid two failure modes: false negatives on companies that are the same entity registered twice, and false positives on unrelated companies that merely share an industry or city. Exact matches on registration number, PAN, or website domain are weighted heavily since they're strong, low-noise signals. Name similarity uses Levenshtein distance after stripping generic business words ("Tech", "Solutions", "Nepal", "Services", legal suffixes like "Pvt Ltd") specifically because unrelated companies in the same market very commonly share these words — without stripping them, the detector would flag most Nepali tech companies against each other. Same city or same industry alone deliberately contribute nothing to the score, since those are extremely common and not evidence of duplication on their own.

## Why direct application instead of a recruiter/agency model

The product deliberately routes applications straight from job seeker to company (no recruiter intermediary, no paid "boosted" applications), reflected in the application-timeline messaging shown to job seekers ("goes directly to the hiring team... no recruiters, no middlemen"). This keeps the data model simple (one `Application` row per job-seeker/job pair) and avoids building marketplace mechanics (bidding, recruiter accounts, commission tracking) that weren't part of the actual problem being solved.

## Tech stack rationale

- **Prisma + PostgreSQL**: a relational model fits this domain well — verification status, application status, and duplicate relationships are all naturally foreign-key/enum-driven, and Prisma's migration workflow gives an auditable schema history.
- **React + Vite, not a meta-framework**: the app is a client-rendered SPA behind a separate API, with no SEO requirement for the authenticated dashboards; a heavier SSR framework wasn't justified for this scope.
- **Zustand over Redux**: the client-side state surface is small (auth session, UI toasts) — a minimal store avoids boilerplate that wouldn't pay for itself here.
- **TanStack Query for server state**: nearly all data in this app is server-owned (jobs, applications, notifications); TanStack Query's cache/invalidation model removes the need to hand-roll loading/refetch logic on every page.
- **`@react-pdf/renderer` for resume export**: chosen specifically because it renders an isolated document tree (`Document`/`Page`/`View`/`Text`) with no reference to the DOM or app shell, avoiding the common failure mode of DOM-capture-based PDF export (e.g. `html2canvas` on `document.body`) leaking navigation chrome or browser UI into the exported file.

## Usability approach

Every data-fetching page in the app follows the same four-state pattern: loading (skeletons, not spinners, to reduce layout shift), error (a message plus a retry action, never a blank screen), empty (a specific empty-state message and a suggested next action, e.g. "No saved jobs yet — Browse Jobs"), and populated. This was treated as a hard requirement rather than a nice-to-have, because the alternative — a white screen or an unhandled `.map()` crash on missing data — was an actual, repeatedly-found defect class during this project's hardening passes, not a hypothetical one.

## Security & testing approach

Security was treated as "assume the frontend is not trusted": every authorization check (role, ownership, verification-gated actions) is enforced again server-side regardless of what the frontend already restricts, and every cross-tenant data access is scoped by the authenticated user's ID rather than any client-supplied identifier. Testing favors integration-style tests that exercise real Express routes against a real (local, disposable) PostgreSQL database rather than mocking Prisma — this was a deliberate choice after finding that code-review-only verification repeatedly missed real defects (a missing `include` on a refetch, a default-status regression) that only surfaced once the actual HTTP round-trip was exercised against live data.

## Known limitations & future work

- **No email delivery** — password-reset links are logged server-side in development rather than sent by email; integrating a transactional email provider is the natural next step before any real deployment.
- **No interview scheduling** — the company dashboard's applicant pipeline stops at status tracking (shortlisted/hired/rejected); there is no calendar/scheduling feature. This was deliberately not built to avoid inventing a feature with no corresponding data model or design.
- **No messaging between companies and job seekers** — all communication currently happens through application status changes and their associated notifications, not a chat/inbox feature.
- **No live business-registry integration** — verification relies on an admin visually reviewing submitted documents and the duplicate-risk score; it does not call out to any government or third-party registry API to confirm a registration number is real.
- **Job expiry is computed, not scheduled** — a job past its deadline is treated as non-applicable at read/apply time rather than having a background job flip its status; this is simple and correct for the current scale but would need a scheduler if, for example, expired jobs needed to trigger their own notifications.
- **Single-instance file storage** — uploaded documents/avatars/logos are stored on local disk, which would need to move to object storage before a multi-instance deployment.
