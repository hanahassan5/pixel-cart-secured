# Pixel Cart — Bug Bounty Project

## Project Idea

Pixel Cart is an e-commerce web application for a gaming store (games, consoles, and accessories). The project was built in two parallel versions to demonstrate practical web application security concepts:

1. **Vulnerable Version** — intentionally contains 9 common web vulnerabilities covered during the training, each connected to a realistic feature of the store (search, reviews, invoices, login, admin tools, file downloads).
2. **Secured Version** — the exact same store, with the same features and functionality, but with all 9 vulnerabilities properly identified and fixed.

The goal is to show, side by side, how each vulnerability works and how it can be correctly prevented — not just to build a working online store.

*(Technical stack: Express backend, MySQL via `mysql2`, EJS for invoice generation, and a Vanilla HTML/CSS/JavaScript frontend.)*


## Team

- Track: Bug Bounty
- Project Name: Pixel Cart

| Name | Responsibility |
|---|---|
| Kamal Ibrahim | Built the vulnerable version of the web application (all vulnerability sinks) |
| Hana Hassan | Fixed SQL Injection, Stored XSS, SSTI, Open Redirect, Information Disclosure |
| Haidy Abdelkareem | Set up the project copy and GitHub repository structure; Fixed SSRF and CSRF |
| Nouran Ghopashy | Fixed Path Traversal |
| Nada Mahrous | Fixed OS Command Injection |

## Project Structure

```text
pixel-cart-BugBounty-Project/
├── vulnerable-version/   -> intentionally contains all 9 vulnerabilities
└── secured-version/      -> same application, all 9 vulnerabilities fixed
```

## Setup / How to Run

Both versions run the same way. Configure `backend/.env` for the local MySQL instance, then run:

```text
cd vulnerable-version/backend    (or secured-version/backend)
npm install
npm run db:setup
npm start
```

Open `http://localhost:3000`, or the port configured in `.env`. The frontend is served by Express.

## Requirements / Libraries

- Node.js (v18+ recommended)
- MySQL (local instance)

Backend dependencies (installed automatically via `npm install`):

| Package | Purpose |
|---|---|
| express | Web server / routing |
| mysql2 | MySQL database driver |
| express-session | Session-based authentication |
| cookie-parser | Parsing cookies |
| bcrypt | Password hashing |
| ejs | Server-side template engine (invoices) |
| axios | Outbound HTTP requests (admin image fetch) |
| multer | Product image upload handling |
| dotenv | Loading `.env` configuration |
| nodemon | Auto-restart server during development |

No frontend build step or package manager is required — the frontend is static HTML/CSS/vanilla JavaScript served directly by Express.

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

## Vulnerabilities Implemented (vulnerable-version)

1. SQL Injection — `GET /api/products?search=`
2. Stored XSS — product review content
3. Server-Side Template Injection (SSTI) — invoice generation
4. Open Redirect — `GET /api/auth/login?next=`
5. Information Disclosure — stack traces returned in error responses
6. OS Command Injection — `POST /api/admin/ping`
7. Server-Side Request Forgery (SSRF) — `POST /api/admin/image`
8. Path Traversal — `GET /api/products/download?file=`
9. Cross-Site Request Forgery (CSRF) — session cookie + permissive CORS

## Security Fixes Applied (secured-version)

| Vulnerability | Fix Applied |
|---|---|
| SQL Injection | Parameterized query (`LIKE ?`) instead of string concatenation |
| Stored XSS | `textContent` instead of `innerHTML` when rendering reviews |
| SSTI | User input passed as EJS data variable, not spliced into template source |
| Open Redirect | `next` param validated to be a relative path only |
| Information Disclosure | Stack traces logged server-side only, never sent to client |
| OS Command Injection | `execFile` with argument array + IP allowlist regex, no shell |
| Server-Side Request Forgery (SSRF) | URL scheme + private/loopback IP checks, redirects disabled |
| Path Traversal | `path.basename()` strips directory traversal, path containment check |
| Cross-Site Request Forgery (CSRF) | Session cookie `SameSite: strict`, CORS restricted to origin allowlist |
