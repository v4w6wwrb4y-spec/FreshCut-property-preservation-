# Security Policy

FreshCut is a property preservation work-order system: a React (Vite) single-page app
in `client/`, an Express API in `server/`, and a SQLite database at `data/freshcut.db`.
It is designed to be self-hosted — the security of a running instance depends on how
the operator deploys and configures it.

## Supported Versions

Security fixes are made on the `main` branch only. There are no maintained release
branches or versioned backports — deploy from `main`, or a branch kept up to date
with it.

| Version                    | Supported          |
| -------------------------- | ------------------ |
| `main` (latest)            | :white_check_mark: |
| Any older branch or fork   | :x:                |

## How Authentication and Authorization Work

- **Passwords** are hashed with `bcryptjs` (`server/routes/auth.js`). Plaintext
  passwords are never stored or logged.
- **Sessions** are stateless JWTs signed with `JWT_SECRET`, valid for 7 days,
  carrying `id`, `role` and `name` (`server/middleware/auth.js`).
- **Roles.** Two roles exist: `manager` and `employee`. Manager-only operations
  (creating/deleting work orders, assigning work, importing from Google Sheets,
  admin dashboard) are rejected with `403` for employees.
- **Protected routes** require an `Authorization: Bearer <token>` header. Public
  endpoints are `/api/auth/login`, `/`, and the uploaded photo files.

### Known limitations of the current design

These are deliberate trade-offs of the current architecture, not undisclosed
vulnerabilities — please do not report them as such:

- Tokens live in browser `localStorage` and cannot be revoked before they expire;
  there is no refresh-token or session-blacklist mechanism.
- `/api/uploads/*` serves task photos as static files, so **anyone holding a photo's
  URL can view it** without signing in. Filenames are randomized.
- There is no rate limiting on `/api/auth/login`.
- If `JWT_SECRET` is unset, the API falls back to a development default. This is
  safe for local work only.
- The seed script creates demo accounts with the password `password123`.

## Reporting a Vulnerability

Please **do not** open a public issue for a security problem.

1. Use GitHub's private reporting for this repository: **Security → Advisories →
   Report a vulnerability**. This keeps the report visible only to maintainers.
2. If private reporting is unavailable, contact the repository owner directly rather
   than posting details publicly.

A useful report includes the affected endpoint or screen, the steps to reproduce it,
the impact you observed, and any proof-of-concept request or screenshot. Please redact
real customer data, addresses, and photos.

**What to expect:** an acknowledgement within 3 business days, an assessment of
severity and a fix plan within 10 business days, and credit in the fix description if
you would like it. If a report is declined as out of scope, you will get the reasoning.

## Deploying Securely (Operator Checklist)

A default `docker compose` run is a development environment. Before exposing an
instance to real users and real client properties:

1. Set a strong, unique `JWT_SECRET` (see `.env.example` for a generator command) and
   pass it through the platform's secret store — never commit it.
2. Change or delete the seeded demo accounts before going live.
3. Terminate TLS in front of the app and serve it over HTTPS only; bearer tokens sent
   over plain HTTP can be intercepted.
4. Restrict network access to the API port (8001) so only the web entry point is
   reachable from outside.
5. Keep `data/` (the SQLite database) and `server/uploads/` (task photos) out of
   version control, and back them up — they contain client property data and
   personally identifying photos. Both paths are already listed in `.gitignore`.
6. Restrict read access to those two directories at the filesystem level; the
   database file is not encrypted at rest.
7. Review the Google Sheets import: the linked sheet must be explicitly shared and its
   ID is deployment-specific. Leave `GOOGLE_SHEETS_SPREADSHEET_ID` unset to disable it.

## Handling Customer Data

Work orders, addresses, timestamps, GPS coordinates, and photos may identify clients
and properties. When sharing reproduction steps, logs, database dumps, or screenshots
in a bug report, redact names, addresses, coordinates, and images.
