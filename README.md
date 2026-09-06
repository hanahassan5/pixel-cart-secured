# Pixel Cart

Pixel Cart is a full-stack gaming store for games, consoles, and accessories, built for the **Web Application Security — Final Project**. The repository contains two parallel versions of the same application:

- `vulnerable-version/` — intentionally contains the vulnerabilities covered in the track.
- `secured-version/` — same features and functionality, with every vulnerability properly fixed.

Both are Express + MySQL (`mysql2`) backends with EJS-rendered invoices and a vanilla HTML/CSS/JavaScript frontend, structured as router → controller → database (no separate service/repository layer).

## Team

- Track: Bug Bounty
- Project Name: Pixel Cart

```
| # | Name              | Responsibility |
|---|-------------------|-----------------|
| 1 | Kamal Ibrahim     | Built the core web application; implemented SQL Injection, Stored XSS, OS Command Injection, SSTI, and CSRF in the vulnerable version. |
| 2 | Haidy Abdelkareem | Implemented Path Traversal, SSRF, Open Redirect, Information Disclosure in the vulnerable version, And the SSRF fix in the secured version. |
| 3 | Hana Hassan       | Implemented the SQL Injection, Stored XSS, SSTI, Open Redirect, and Information Disclosure fixes in the secured version. |
| 4 | Nada Mahrous      | Implemented the OS Command Injection and CSRF fixes in the secured version. |
| 5 | Nouran Muhammad   | Set up the GitHub repository structure and organization (including the README); implemented the Path Traversal fix in the secured version. |
```

## Setup / How to Run the Project

Each version has its own `backend/` and is run independently. From either `vulnerable-version/backend` or `secured-version/backend`:

```text
cd backend
npm install
npm run db:setup
npm start
```

Configure `backend/.env` first (no `.env.example` is committed — create one with at least `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `SESSION_SECRET`). Both versions default to the same database name (`gaming_store`) and port (`3000`), so if you want to run both versions side by side, point them at different databases and/or ports in each `.env`.

## Accounts

After running the database setup, register a new account through the application's registration page before using the application.

## Requirements / Libraries

- Node.js (v18+ recommended)
- MySQL (local instance)

Open `http://localhost:3000` (or the port configured in `.env`) — the frontend is served by Express.

## Database

Schema files are located in `backend/database/migrations`, and development seed data is stored in `backend/database/seeds/seed.sql`.

The database setup is explicit and must be run before starting the application:npm run db:setup

## API

Authentication: `POST /api/auth/register`, `POST /api/auth/login` (accepts an optional `?next=` redirect target), `POST /api/auth/logout`, `GET /api/auth/me`.

Products: `GET /api/products` (search/category/price/sort/pagination via query params), `GET /api/products/:id`, `GET /api/products/download?file=`, `POST|PUT|DELETE /api/products` (admin only), `GET|POST /api/products/:id/reviews`.

Commerce: `GET|POST /api/cart`, `PUT|DELETE /api/cart/:productId`, `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`.

Users: `GET /api/users/profile`, `POST /api/users/profile` (update name/email), `GET /api/users/invoice?orderId=&name=`, `POST /api/users/avatar/import`, `POST /api/users/network-diagnostics`.

Admin: `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`.

Assignment-specific vulnerable/secured behavior is isolated to its named endpoints as required by the academic exercise.

## Vulnerabilities Implemented (vulnerable-version) → Fix Applied (secured-version)

1. **SQL Injection** — `GET /api/products?search=` (also the `category` filter) → parameterized queries.
2. **Stored XSS** — product review content, rendered via `innerHTML` on the product page → rendered as `textContent`.
3. **Server-Side Template Injection (SSTI)** — `GET /api/users/invoice?name=`, raw value spliced into EJS source before rendering → passed as a template data variable and auto-escaped.
4. **Path Traversal** — `GET /api/products/download?file=` → filename resolved with `path.basename` and confined to the uploads directory.
5. **Cross-Site Request Forgery (CSRF)** — session cookie with `sameSite: false` + credentialed CORS reflecting any origin, affecting `POST /api/cart` and `POST /api/users/profile` → `sameSite: "strict"` cookie, an explicit CORS origin allowlist, and a synchronizer CSRF token required on `POST /api/users/profile`.
6. **Server-Side Request Forgery (SSRF)** — `POST /api/users/avatar/import` (`req.body.url` fetched via Axios with no restrictions) → scheme/hostname validated against loopback/private/link-local ranges before fetching, with redirects disabled.
7. **OS Command Injection** — `POST /api/users/network-diagnostics` (`req.body.host` concatenated into a shell `ping` command) → strict hostname/IP validation plus `execFile` (no shell).
8. **Open Redirect** — `POST /api/auth/login?next=` → only same-site relative paths are honored.
9. **Information Disclosure** — global error handler returned the full stack trace in the JSON response → stack trace logged server-side only; response no longer includes it.