# Base44 Development Notes

## Stack
- **Frontend**: React 18 + Vite (client directory), served on port 3000 via Vite dev server.
- **Backend**: Express.js + better-sqlite3 (server directory), internal port 8001.
- **Database**: SQLite file at `data/freshcut.db` (auto-created, seeded on first boot).
- **Auth**: JWT tokens stored in localStorage; `bcryptjs` for password hashing.
- **Photos**: Uploaded via multer to `server/uploads/`, served at `/api/uploads/`.

## Running
- `docker compose -f docker-compose.base44.yml up -d` — starts both services.
- The API service runs `npm install`, seeds the DB, then starts nodemon.
- The web service waits for the API healthcheck before starting Vite.
- Vite proxies `/api` requests to the backend service.

## Demo Accounts (password: `password123`)
- Manager: `manager@freshcut.com`
- Employee: `mike@freshcut.com`, `lisa@freshcut.com`

## Verification
- `curl -fsS http://localhost:3000/` — should return the Vite HTML shell.
- `curl -fsS -H 'Host: external-preview.example.com' http://localhost:3000/` — external host check.
- `curl -fsS http://localhost:8001/api/auth/me` — API health (returns 401 without token, proves it's running).

## Notes
- The old static `Index.html` was removed; the app is now a full React SPA.
- SQLite DB and uploads are git-ignored (in `.gitignore`).
- No external secrets or services required.
