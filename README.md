# FreshCut Property Preservation

AI-powered property preservation work order management system for managing work orders, guiding field technicians through required tasks, collecting required photos with GPS and timestamps, tracking progress in real time, generating client-ready reports, and supporting all major property preservation workflows.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite (`client/`), dev server on port 3000 |
| Backend | Express 4 + better-sqlite3 (`server/`), port 8001 |
| Database | SQLite file at `data/freshcut.db` (created and seeded on first boot) |
| Auth | JWT in `localStorage`, bcryptjs password hashing |
| Photos | multer uploads to `server/uploads/`, served at `/api/uploads/` |

## Project structure

```
client/            React app (Vite)
  src/pages/       Login, ManagerDashboard, CreateWorkOrder, WorkOrderDetail,
                   EmployeeJobs, EmployeeTaskList
  src/components/  Layout, PhotoTimeline
  vite.config.js   Dev server on 3000, proxies /api to the backend
server/            Express API
  routes/          auth, work-orders, tasks, photos, sheets
  db.js            Schema creation
  seed.js          Demo data (idempotent — skips if users exist)
docker-compose.base44.yml   Development stack (web + api)
```

## Option A — Docker (recommended)

Requires Docker with Compose v2. Nothing else needs to be installed; the services run on the `node:22` image, install dependencies on start, seed the database, then run the dev servers with live reload.

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- App: <http://localhost:3000>
- API: internal to the Compose network on port 8001 (`/api` is proxied by Vite, so the browser only needs port 3000)
- Source is bind-mounted, so edits reload live. The API restarts itself via nodemon.
- Stop with `docker compose -f docker-compose.base44.yml down` (add `-v` to also drop the `node_modules` volumes).

## Option B — Local Node.js

Requires Node.js 22 (npm 10) and a C++ toolchain only if prebuilt binaries are unavailable for `better-sqlite3`. Two terminals:

```bash
# 1. Backend — install, seed, run (port 8001)
npm ci
npm run seed
npm run dev

# 2. Frontend — install and run (port 3000)
cd client
npm ci
VITE_API_URL=http://127.0.0.1:8001 npm run dev
```

`VITE_API_URL` is required for local runs: the Vite proxy defaults to the Compose hostname `http://api:8001`, which does not resolve outside Docker.

Open <http://localhost:3000>.

## Demo accounts

Password for all accounts: `password123`

| Role | Email |
| --- | --- |
| Manager | `manager@freshcut.com` |
| Employee | `mike@freshcut.com` |
| Employee | `lisa@freshcut.com` |

## Optional configuration

| Variable | Purpose |
| --- | --- |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Enables the manager dashboard's Google Sheets work-order import. Use the ID from `docs.google.com/spreadsheets/d/<ID>/edit` and share the sheet as "Anyone with the link → Viewer". Omit it to run without the import — nothing else depends on it. |

In Docker, put local placeholders in `.env.base44-defaults`; real values are supplied through the platform-managed env file (`/run/base44/app.env`), which is loaded last so it always wins.

## Verifying an install

Run from a clean checkout (no `node_modules`, no `data/`):

```bash
# 1. Dependencies install from the lockfiles without errors
npm ci
cd client && npm ci && cd ..

# 2. Production build completes
cd client && npm run build && cd ..

# 3. Backend boots and the schema is created
npm run seed
```

Expected results:

- Both `npm ci` runs end with `added <n> packages` and no errors, confirming `package-lock.json` matches `package.json`.
- `npm run build` prints `✓ built in …` and writes `client/dist/`.
- The seed prints `✓ Seed complete — 3 users, 3 work orders, 10 tasks` (or `Database already has data — skipping seed.` on a re-run).
- With the stack running: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/` returns `200`, and `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/me` returns `401` — the app is served and the API is reachable through the proxy.
- Sign in as the manager and the dashboard lists three seeded work orders.

## Notes

- `data/` (SQLite database) and `server/uploads/` are git-ignored; delete `data/` to get a fresh seed.
- No external services or credentials are required for the core app.
