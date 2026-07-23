# LocalSkill

LocalSkill is a job marketplace web application for Nepal, connecting job seekers directly with employers. It supports three roles — job seeker, company, and admin — each with a dedicated dashboard, plus an admin-run company verification workflow to keep listings trustworthy.

For system design and data model details, see [ARCHITECTURE.md](ARCHITECTURE.md). For the problem background and design rationale, see [RESEARCH.md](RESEARCH.md).

## Tech stack

- **Frontend**: React 19 + Vite, Tailwind CSS, Zustand (state), TanStack Query (server state/caching), React Hook Form + Zod (forms/validation), Recharts (analytics), `@react-pdf/renderer` (resume PDF export).
- **Backend**: Node.js + Express 5, Prisma ORM (`@prisma/adapter-pg` driver adapter) over PostgreSQL, JWT auth (`jsonwebtoken`), bcrypt, Multer (file uploads).

## Prerequisites

- Node.js 20+
- A running PostgreSQL instance

## Setup (new machine)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
# edit .env — set DATABASE_URL to a real Postgres connection string,
# and JWT_SECRET to a long random value (never reuse the example placeholder)
npx prisma generate
npx prisma migrate deploy
npm run dev          # starts the API on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env  # defaults to http://localhost:5000/api, edit if needed
npm run dev           # starts the app on http://localhost:5173, proxies /api to the backend
```

There is no seed script — create your first accounts through the app's registration flow (`/register`). Admin accounts cannot be self-registered (see [ARCHITECTURE.md](ARCHITECTURE.md#authentication--roles)); create one directly in the database if you need to test the admin dashboard:

```bash
cd backend
node -r dotenv/config -e "
const bcrypt = require('bcrypt');
const prisma = require('./src/lib/prisma');
(async () => {
  const hash = await bcrypt.hash('<choose-a-password>', 12);
  await prisma.user.create({ data: { email: '<your-email>', password: hash, role: 'ADMIN' } });
  process.exit(0);
})();
"
```

## Common commands

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | `backend/` | Start the API with auto-restart (nodemon) |
| `npm start` | `backend/` | Start the API (production mode) |
| `npm test` | `backend/` | Run the backend test suite (`node:test`) |
| `npm run db:generate` | `backend/` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | `backend/` | Create and apply a migration (requires an interactive TTY) |
| `npm run db:studio` | `backend/` | Open Prisma Studio, a DB browser GUI |
| `npm run dev` | `frontend/` | Start the Vite dev server |
| `npm run build` | `frontend/` | Production build to `frontend/dist/` |
| `npm run lint` | `frontend/` | Run ESLint |

### Migrating in a non-interactive environment

`prisma migrate dev` requires a TTY and will refuse to run in CI or sandboxed shells. In that case, generate and apply migrations manually:

```bash
cd backend
npx prisma migrate diff --from-config-datasource prisma.config.js --to-schema prisma/schema.prisma --script > /tmp/diff.sql
mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_your_migration_name"
mv /tmp/diff.sql "prisma/migrations/<the folder you just made>/migration.sql"
npx prisma migrate deploy
npx prisma generate
```

## Project structure

```
backend/
  src/
    controllers/   route handlers, one per resource
    routes/        Express routers, wire auth/role middleware to controllers
    middleware/     auth (JWT), role (RBAC), upload (Multer)
    services/       cross-cutting logic (duplicate detection, audit logs, notifications)
    utils/          response envelope helpers, validation
    lib/prisma.js   the single shared PrismaClient instance
  prisma/
    schema.prisma
    migrations/
  test/             node:test suite
frontend/
  src/
    pages/          route-level components, grouped by role (public/auth/jobseeker/company/admin)
    components/      shared UI primitives and role-specific widgets
    services/        one Axios-based service module per backend resource
    store/           Zustand stores (auth, UI/toasts)
    routes/          route tree + role-based route guards
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list. Never commit a `.env` file — both are gitignored. Rotate `JWT_SECRET` and your database credentials before deploying anywhere beyond local development.

## Known limitations

- No email service is configured — password-reset links are logged to the server console in development instead of being emailed.
- No interview-scheduling feature exists (no model, no UI); the company dashboard's "interviews scheduled" metric is intentionally a fixed `0`, not a placeholder.
- No messaging/conversations feature exists between companies and job seekers.
- Job expiry is computed at read/apply time from `deadline < now()` rather than a background scheduler flipping a stored status.
