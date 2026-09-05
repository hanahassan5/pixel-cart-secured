# Vulnerable Web Application - Complete Technical Audit

## 1. Executive Summary

Pixel Cart is a local gaming e-commerce application. The frontend is a responsive vanilla HTML/CSS/JavaScript storefront. The backend is an Express application using MySQL through `mysql2`, Express sessions for authentication, EJS for invoices, Multer for product images, Axios for the SSRF laboratory endpoint, and `child_process.exec` for the command-injection laboratory endpoint.

This repository is the intentionally vulnerable laboratory version. The required vulnerable sinks are preserved for controlled local testing. Ordinary runtime defects found during the restoration work were fixed only where they did not remove an intended sink.

## 2. Application Architecture

```text
Browser
  -> frontend HTML and JavaScript
  -> shared fetch client in frontend/js/api.js
  -> Express /api router in backend/src/modules/index.js
  -> module router and controller
  -> MySQL, filesystem, EJS, Axios, or OS command
  -> HTTP response
  -> frontend DOM rendering
```

Important backend files:

- `backend/server.js`: loads environment configuration and starts Express.
- `backend/src/app.js`: CORS, JSON/form parsing, sessions, EJS setup, API mounting, static files, 404 handling, and global error handling.
- `backend/src/DB/DBConnection.js`: MySQL connection pool.
- `backend/src/modules/index.js`: mounts authentication, users, products, cart, orders, and admin routers.
- `backend/src/middleware/authMiddleware.js`: session authentication.
- `backend/src/middleware/adminMiddleware.js`: admin-role authorization.
- `backend/src/middleware/uploader.js`: product image upload validation and storage.
- `backend/src/middleware/errorHandler.js`: JSON error responses including stack traces for the laboratory disclosure.

## 3. Project Structure

```text
backend/
  server.js
  src/app.js
  src/DB/DBConnection.js
  src/middleware/
  src/modules/auth/
  src/modules/users/
  src/modules/products/
  src/modules/cart/
  src/modules/orders/
  src/modules/admin/
  src/views/invoice.ejs
  database/migrations/
  database/seeds/seed.sql
frontend/
  index.html, products.html, product.html
  login.html, register.html, profile.html
  cart.html, checkout.html, orders.html, admin.html
  css/style.css
  js/api.js and page-specific modules
```

## 4. Authentication and Authorization

Registration and login create an Express session containing a user object. `requireAuth` checks `req.session.user`; `requireAdmin` checks the role. Product reviews, cart, checkout, profile, orders, and invoice are authenticated. Product administration and laboratory SSRF/command routes require an authenticated admin.

The invoice route now requires authentication and selects orders using both the requested order ID and the current session user ID. An order belonging to another user returns `404`; an unauthenticated request returns `401`.

The session cookie intentionally has no SameSite restriction and the CORS middleware reflects request origins with credentials enabled. This preserves the CSRF laboratory condition.

## 5. Database Architecture

- `users`: id, name, email, password hash, role, timestamps.
- `products`: id, name, description, price, stock, category, image, timestamps.
- `reviews`: product_id and user_id foreign keys, content, rating, created_at.
- `cart_items`: user_id/product_id relationship and quantity.
- `orders`: user_id, total_price, status, created_at.
- `order_items`: order_id/product_id relationships, quantity, and purchase-time price.

Products and users are seeded. The seed includes a real review for Arcade Controller. Orders are created through the normal checkout transaction; no order seed is required.

## 6. Frontend Architecture

`frontend/js/api.js` provides the shared fetch wrapper with credentials. `auth.js` handles registration and login. `products.js` and `product.js` render catalog and detail pages. `product.js` loads database-backed reviews, calculates average/rating distribution, and intentionally assigns review content to `innerHTML`. `cart.js`, `checkout.js`, and `orders.js` implement commerce flows. `profile.js` loads account information and links to the authenticated invoice route. `admin.js` supports administration and the two admin laboratory endpoints.

## 7. Invoice Feature

### Route and access control

- Route: `GET /api/users/invoice?orderId=<id>&name=<customer-name>`
- Router: `backend/src/modules/users/user.router.js:8`
- Controller: `backend/src/modules/users/user.controller.js:18-61`
- Authentication: `requireAuth`
- Ownership: the order query requires `orders.user_id = req.session.user.id`.
- If `orderId` is omitted, the most recent order owned by the session user is selected.

### Data flow

```text
Authenticated browser
  -> orders.js invoice link with orderId
  -> GET /api/users/invoice
  -> requireAuth
  -> users + orders ownership query
  -> order_items + products query
  -> cent-based subtotal calculation
  -> invoice.ejs
  -> rendered HTML invoice
```

### Invoice content

`backend/src/views/invoice.ejs:51-90` provides the branded header, invoice/order identifiers, invoice and order dates, payment/order status, customer identity, item table, unit prices, quantities, subtotals, zero-valued unsupported financial fields, grand total, footer, print button, and download link.

The application schema has no phone, discount, tax, or shipping fields. The invoice therefore does not invent those values and displays `$0.00` only for unsupported fields. The grand total is the actual `orders.total_price` value. Item subtotals are calculated using integer cents in `user.controller.js:39-46`.

### Print and download

- `Print Invoice` calls native `window.print()` at `invoice.ejs:51`.
- Print CSS hides the toolbar and removes screen-only shadows at `invoice.ejs:19-42`.
- `?download=1` sets `Content-Disposition: attachment` with filename `invoice-<order-id>.html` at `user.controller.js:55-56`.
- The downloaded HTML is a complete readable invoice. The native print dialog supports Save as PDF without adding a large dependency.

### SSTI preservation

The intentional SSTI source and sink are preserved at `user.controller.js:52-53`:

```js
const template = source.replaceAll("<!-- SSTI_CUSTOMER_NAME -->", req.query.name ?? order.customer_name);
const html = ejs.render(template, { invoice });
```

The raw `name` query value is inserted into EJS source before rendering. A normal name renders a complete invoice. The local payload `<%= 7 + 7 %>` renders as `14` in the customer field, proving that the functional invoice did not remove SSTI.

## 8. Vulnerability Inventory

The following locations remain intentionally vulnerable. The statuses below distinguish this phase's direct attack execution from source-only inspection.

### SQL Injection

- CWE: CWE-89
- Endpoint: `GET /api/products?search=`
- Source: `req.query.search`
- Sink: concatenated SQL in `backend/src/modules/products/product.controller.js:16-21`
- Result: confirmed in the previous local verification; a tautology search returned the product set.
- Remediation for the future secure version: parameterize this search query.

### Stored XSS

- CWE: CWE-79
- Endpoint: `POST /api/products/:id/reviews`
- Source: review content in `req.body.content`
- Storage: `product.controller.js:128-132`
- Sink: `frontend/js/product.js:268`, `innerHTML = review.content`
- Result: source sink and database-backed flow present. Browser script execution was not re-run during invoice work.
- Remediation: context-appropriate output encoding or a carefully scoped sanitizer in the secure version.

### SSTI

- CWE: CWE-1336
- Endpoint: authenticated `GET /api/users/invoice?orderId=&name=`
- Source: `req.query.name`
- Sink: `user.controller.js:52-53`, raw EJS source insertion followed by `ejs.render`
- Result: confirmed. `<%= 7 + 7 %>` rendered as `14` while the complete invoice remained present.
- Remediation: pass customer data as template variables and never concatenate user input into template source.

### Path Traversal

- CWE: CWE-22
- Endpoint: `GET /api/products/download?file=`
- Source: `req.query.file`
- Sink: `product.controller.js:248`, `path.join(UPLOADS_ROOT, filename)` followed by `res.download`
- Result: confirmed in the previous local verification with a safe application-local file.
- Remediation: enforce a canonical path boundary in the secure version.

### CSRF

- CWE: CWE-352
- Endpoint: authenticated state-changing cart request, `POST /api/cart`
- Source: cross-origin browser request with session cookie
- Sink: cart mutation at `cart.controller.js`, reached through permissive credentialed CORS in `app.js:23-24` and unrestricted SameSite behavior at `app.js:59`
- Result: CORS preflight was confirmed. A complete cross-origin state-change demonstration was not re-run during invoice work.
- Remediation: CSRF tokens and appropriate SameSite/origin policy in the secure version.

### SSRF

- CWE: CWE-918
- Endpoint: admin `POST /api/admin/image`
- Source: `req.body.url`
- Sink: `admin.controller.js:55`, `axios.get`
- Result: sink present; controlled listener execution was not re-run during invoice work.
- Remediation: allowlist schemes/hosts and enforce network egress policy.

### OS Command Injection

- CWE: CWE-78
- Endpoint: admin `POST /api/admin/ping`
- Source: `req.body.ip`
- Sink: `admin.controller.js:65`, `child_process.exec`
- Result: sink present; harmless command output was not re-run during invoice work.
- Remediation: use an argument-based API and strict host validation in the secure version.

### Open Redirect

- CWE: CWE-601
- Endpoint: `POST /api/auth/login?next=`
- Source: `req.query.next`
- Sink: `auth.controller.js:39`, `res.redirect(req.query.next)`
- Result: sink present; authenticated redirect was not re-run during invoice work.
- Remediation: allow only local relative destinations or a strict allowlist.

### Information Disclosure

- CWE: CWE-209
- Endpoint: any error reaching the global handler
- Source: controlled application exception
- Sink: `backend/src/middleware/errorHandler.js:18`, `stack: err.stack`
- Result: sink present; a fresh error response was not re-run during invoice work.
- Remediation: return generic client errors and log stack traces server-side only.

## 9. Verification Matrix

| Vulnerability | Source | Sink | Endpoint | Current audit status |
|---|---|---|---|---|
| SQL Injection | `req.query.search` | SQL concatenation | `GET /api/products` | CONFIRMED previously |
| Stored XSS | review body | `innerHTML` | `POST /api/products/:id/reviews` | PRESENT, browser execution not re-run |
| SSTI | `req.query.name` | `ejs.render` | `GET /api/users/invoice` | CONFIRMED |
| Path Traversal | `req.query.file` | `path.join`/download | `GET /api/products/download` | CONFIRMED previously |
| CSRF | cross-origin session request | cart mutation | `POST /api/cart` | Preflight confirmed; state change not re-run |
| SSRF | `req.body.url` | `axios.get` | `POST /api/admin/image` | PRESENT, listener not re-run |
| Command Injection | `req.body.ip` | `child_process.exec` | `POST /api/admin/ping` | PRESENT, output not re-run |
| Open Redirect | `req.query.next` | `res.redirect` | `POST /api/auth/login` | PRESENT, redirect not re-run |
| Information Disclosure | thrown error | `err.stack` | global error handler | PRESENT, response not re-run |

## 10. Email-Update Removal

A full project search found no `update-email`, `updateEmail`, email-change handler, email mutation route, or profile email mutation. `POST /api/users/update-email` returned `404`. Registration, login, authentication, and profile email display remain available.

## 11. Invoice Functional Evidence

A disposable local account was registered through the normal API, then product 4 was added to the cart with quantity 2 and checkout created order 9:

- Product: Arcade Controller
- Quantity: 2
- Unit price: $29.99
- Expected subtotal: `2 * 29.99 = $59.98`
- Database order total: `$59.98`
- Rendered invoice subtotal: `$59.98`
- Rendered invoice grand total: `$59.98`
- Normal invoice response: HTTP 200, complete HTML, product/customer/total present
- SSTI response: HTTP 200, `<%= 7 + 7 %>` rendered as `14`
- Download response: HTTP 200, `Content-Disposition: attachment; filename="invoice-9.html"`
- Browser invoice title: `Invoice #PX-00009 | Pixel Cart`
- Print control: present and callable with `window.print()`
- Wrong-owner order request: HTTP 404
- Unauthenticated invoice request: HTTP 401

## 12. Validation Commands

- `npm run check`: passed.
- `npm test`: passed with zero tests defined.
- Editor diagnostics for invoice controller, EJS template, order script, and profile script: no errors.
- Live browser/API verification: normal invoice, SSTI evaluation, download headers, totals, print control, ownership, and unauthenticated access all executed.
