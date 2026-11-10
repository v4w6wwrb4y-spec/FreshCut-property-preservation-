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

## Authentication (JWT)

The API is stateless: every protected request must carry a signed JWT. There are no
cookies and no server-side sessions, so the client is responsible for holding the
token and attaching it to each call.

### 1. Obtain a token

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "manager@freshcut.com", "password": "password123" }
```

A successful login (`200`) returns the token and the user record:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "user": { "id": 1, "name": "Dana Manager", "email": "manager@freshcut.com", "role": "manager" }
}
```

Missing fields return `400`; wrong credentials return `401 { "error": "Invalid email or
password" }`. Passwords are compared with `bcryptjs` against `users.password_hash` — the
API never returns or logs a password hash.

### 2. What is inside the token

`server/middleware/auth.js` signs `{ id, role, name }` with `JWT_SECRET` (HS256) and a
**7-day expiry**:

```js
jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
```

`authRequired` verifies the signature and expiry on every protected route and exposes the
payload as `req.user`. The route then decides what that role may do — e.g. employees only
see work orders assigned to them, and manager-only actions return `403`.

`JWT_SECRET` must be the same for every API instance and must be set in production
(`.env.example` includes a generator command). Changing it invalidates all issued tokens.
If it is unset, the API falls back to a development default — never rely on that outside
local development.

### 3. Where the client stores the token

The React app keeps the raw token string in **`localStorage` under the key `token`**
(`client/src/context/AuthContext.jsx`):

- `login()` — after `POST /api/auth/login`, calls `localStorage.setItem("token", data.token)`
  and puts the user in context.
- On app load — if a token exists, `GET /api/auth/me` is called to re-validate it. A failure
  removes the token, so an expired or forged token can't leave the UI in a half-signed-in
  state.
- `logout()` — `localStorage.removeItem("token")` and clears the user.

Because the token is readable by JavaScript, it is exposed if the page suffers an XSS bug.
Do not add third-party scripts casually; see `SECURITY.md` for the current stance and
limitations (no refresh tokens, no revocation before the 7-day expiry).

### 4. Send it on protected routes

Add the header to every API call that is not login:

```http
GET /api/work-orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…
```

In the app, `client/src/api.js` does this centrally — `get`, `post`, `patch` and `delete`
read the token from `localStorage` and set `Authorization` when present, so page code
never touches the token:

```js
const token = localStorage.getItem("token");
fetch(`/api${path}`, {
  ...options,
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  },
});
```

`api.upload()` does the same for `multipart/form-data` photo uploads, but sets **only**
the `Authorization` header — the browser must add `Content-Type` itself so the multipart
boundary is correct.

From the command line:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@freshcut.com","password":"password123"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/work-orders
```

### 5. Public vs. protected endpoints

| Endpoint | Access |
| --- | --- |
| `POST /api/auth/login` | Public |
| `GET /` and the static app assets | Public |
| `GET /api/uploads/*` | Public (photo files are served as static URLs) |
| `GET /api/auth/me`, `GET /api/auth/users/employees` | Any signed-in user |
| `/api/work-orders/*`, `/api/tasks/*`, `/api/photos/*` | Signed-in user; scope narrowed by role |
| `POST /api/sheets/sync` | Manager only (`403` for employees) |

### 6. When a token is rejected

- No `Authorization` header, or one that doesn't start with `Bearer ` → `401 { "error":
  "Authentication required" }`.
- Bad signature, malformed token, or past the 7-day expiry → `401 { "error": "Invalid or
  expired token" }`.
- Valid token but insufficient role → `403`.

On a `401` the client should drop the token and send the user back to `/login`; `403`
means "signed in, not allowed" and should be shown as an error, not a logout. The app's
`AuthProvider` currently handles this by clearing the token when the startup `/auth/me`
check fails.

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
