# Pixel Cart

Pixel Cart is a full-stack gaming store for games, consoles, and accessories. It uses a layered Express backend, MySQL through `mysql2`, EJS for invoices, and a responsive Vanilla HTML/CSS/JavaScript frontend.

## Setup

Configure `backend/.env` for the local MySQL instance, then run:

```text
cd backend
npm install
npm run db:setup
npm start
```

## Requirements / Libraries

- Node.js (v18+ recommended)
- MySQL (local instance)

Open `http://localhost:3000`, or the port configured in `.env`. The frontend is served by Express.

## Database

Schema files are in `backend/database/migrations`, seed data is in `backend/database/seeds/seed.sql`, and setup is explicit through `npm run db:setup`. The application never changes schema during startup.

Demo accounts use password `password`: `demo@example.com` and admin `admin@example.com`.

## API

Authentication: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Products: `GET /api/products`, `GET /api/products/:id`, `POST|PUT|DELETE /api/products`, and `GET|POST /api/products/:id/reviews`.

Commerce: `GET|POST /api/cart`, `PUT|DELETE /api/cart/:productId`, `POST /api/orders`, `GET /api/orders`, and `GET /api/orders/:id`.

Users: `GET /api/users/profile` and `GET /api/users/invoice`.

Admin: `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`, `POST /api/admin/image`, and `POST /api/admin/ping`.

The backend is organized as router -> controller -> service -> repository -> database. The frontend keeps page logic in separate files under `frontend/js`, with `api.js` as the shared Fetch layer.

Assignment-specific vulnerable behavior is isolated to its named endpoints as required by the academic exercise.


## Team

- Track: Bug Bounty
- Project Name: Pixel Cart

| Name | Responsibility |
|---|---|
| Haidy Abdelkareem | set up the project copy and GitHub repository structure, Fixed SSRF and CSRF |
| Hana Hassan | Fixed SQL Injection, Stored XSS, SSTI, Open Redirect, Information Disclosure |
| Nouran Ghopashy | Fixed Path Traversal |
| Nada Mahrous | Fixed OS Command Injection |

## Vulnerabilities Fixed

| Vulnerability | Fix Applied |
|---|---|
| SQL Injection | Parameterized query (`LIKE ?`) instead of string concatenation |
| Stored XSS | `textContent` instead of `innerHTML` when rendering reviews |
| SSTI | User input passed as EJS data variable, not spliced into template source |
| Open Redirect | `next` param validated to be a relative path only |
| Information Disclosure | Stack traces logged server-side only, never sent to client |
| Server-Side Request Forgery (SSRF) | URL scheme + private/loopback IP checks, redirects disabled |
| Cross-Site Request Forgery (CSRF) | Session cookie `SameSite: strict`, CORS restricted to origin allowlist |
| Path Traversal | `path.basename()` strips directory traversal, path containment check |
| OS Command Injection | `execFile` with argument array + IP allowlist regex, no shell |
