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
| Kamal Ibrahim | Built the vulnerable version of the web application (all vulnerability sinks) |

## Vulnerabilities Implemented

1. SQL Injection — `GET /api/products?search=`
2. Stored XSS — product review content
3. Server-Side Template Injection (SSTI) — invoice generation
4. Open Redirect — `GET /api/auth/login?next=`
5. Information Disclosure — stack traces returned in error responses
6. OS Command Injection — `POST /api/admin/ping`
7. Server-Side Request Forgery (SSRF) — `POST /api/admin/image`
8. Path Traversal — `GET /api/products/download?file=`
9. Cross-Site Request Forgery (CSRF) — session cookie + permissive CORS
