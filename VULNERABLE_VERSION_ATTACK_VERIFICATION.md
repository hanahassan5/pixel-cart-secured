# Vulnerable Version Attack Verification

This document records controlled local testing for the intentionally vulnerable Pixel Cart laboratory. Tests use only local application data and harmless payloads.

## Application Under Test

- Base URL: `http://127.0.0.1:3000`
- Backend: Express with MySQL and session authentication
- Frontend: vanilla HTML/CSS/JavaScript
- Invoice test account: disposable local account created through registration during verification
- Invoice test order: order 9

## Attack #1 - SQL Injection

### Target

`GET /api/products?search=`

### Normal Request

`GET /api/products?search=Arcade`

### Malicious Test

`GET /api/products?search=%27%20OR%201%3D1%20%23`

### HTTP Response

HTTP 200. The response returned the product collection instead of a nonexistent/limited search result.

### Evidence

The controller concatenates `req.query.search` into `SELECT * FROM products WHERE name LIKE '%...%'`. The tautology payload changed the query behavior and returned seeded products.

### Why This Proves SQL Injection

The attacker-controlled quote closes the intended string and adds a true condition. The database, rather than the application search logic, interprets the injected SQL.

### Screenshot Opportunity

Capture the normal search result beside the tautology response and the source fragment in `product.controller.js`.

## Attack #2 - Stored XSS

### Target

`POST /api/products/4/reviews`, then product page review rendering.

### Normal Request

Submit a normal rating and review through the product page.

### Malicious Test

Use a harmless local proof payload such as a script that changes a visible local marker. Do not send data externally.

### HTTP Response

The backend stores review content without sanitization. `frontend/js/product.js:268` assigns the stored value to `innerHTML`.

### Evidence

The database-backed review API returns the stored content and the product page uses the review body as an HTML sink. A browser execution proof was not re-run during the invoice phase, so this report does not claim fresh script execution evidence.

### Why This Proves Stored XSS

The same attacker-controlled value survives storage, is returned by the review API, and reaches an unsafe browser HTML sink.

### Screenshot Opportunity

Capture the submitted review, a reload of the product page, and the harmless visible local marker.

## Attack #3 - SSTI Against Invoice

### Target

Authenticated `GET /api/users/invoice?orderId=9&name=`

### Normal Request

`GET /api/users/invoice?orderId=9&name=John%20Doe`

### Malicious Test

`GET /api/users/invoice?orderId=9&name=%3C%25%3D%207%20%2B%207%20%25%3E`

### HTTP Response

HTTP 200. The full invoice rendered, and the customer field contained `14`. The raw expression was absent from the rendered output.

### Evidence

The controller inserts the raw query value into the EJS source and then calls `ejs.render`. The browser showed a complete invoice with product, quantity, subtotal, grand total, and the evaluated value `14`.

### Why This Proves SSTI

The server evaluated attacker-supplied template syntax rather than treating it as ordinary customer text.

### Screenshot Opportunity

Capture the invoice customer field showing `14`, the complete invoice around it, and the controller source at `user.controller.js:52-53`.

## Attack #4 - Path Traversal

### Target

`GET /api/products/download?file=`

### Normal Request

Request a file under the product upload area.

### Malicious Test

Use a safe application-local traversal target such as `../src/views/invoice.ejs`.

### HTTP Response

HTTP 200/download response was observed. The route is reached because `/download` is registered before `/:id`.

### Evidence

`req.query.file` reaches `path.join(UPLOADS_ROOT, filename)` and `res.download` without a boundary check.

### Why This Proves Path Traversal

The requested path can move outside the intended upload directory and access an application-local file.

### Screenshot Opportunity

Capture the download request and response headers, not sensitive file contents.

## Attack #5 - CSRF

### Target

Authenticated `POST /api/cart` from a second local origin.

### Normal Request

Log in, record the cart state, then add a product normally.

### Malicious Test

Send a cross-origin preflight and POST from a local attacker origin such as `http://127.0.0.1:5500`.

### HTTP Response

The preflight returned HTTP 204 with `Access-Control-Allow-Origin` reflecting the attacker origin and `Access-Control-Allow-Credentials: true`.

### Evidence

The session cookie has `sameSite: false`, and no CSRF token is required by the cart router. A complete cross-origin state-change demonstration was not re-run during the invoice phase.

### Why This Proves CSRF

The conditions permit a browser-originated authenticated state-changing request without a CSRF token. A final presentation should capture the cart before/after through two local origins.

### Screenshot Opportunity

Capture the attacker-origin request, reflected CORS headers, session cookie, and cart quantity before and after.

## Attack #6 - SSRF

### Target

Admin `POST /api/admin/image`.

### Normal Request

Submit a local image URL as an administrator.

### Malicious Test

Start a temporary local HTTP listener and submit its local URL as `url`.

### HTTP Response

The controller passes the URL to `axios.get` and returns the fetched bytes.

### Evidence

The exact sink is `admin.controller.js:55`. A controlled listener log should show the request arriving from the backend process. Listener execution was not re-run during invoice work.

### Why This Proves SSRF

A server-side request to a URL selected by the client is observable at the controlled listener.

### Screenshot Opportunity

Capture the listener log and the API request/response together.

## Attack #7 - OS Command Injection

### Target

Admin `POST /api/admin/ping`.

### Normal Request

Submit a local host value for ping.

### Malicious Test

Use a harmless Windows command separator and output command, for example a local `echo` marker appropriate to the active shell. Do not modify files or access secrets.

### HTTP Response

The controller calls `child_process.exec` with a string containing the user input. The Windows compatibility fix only changed the ping count flag to `-n`; it did not remove shell execution.

### Evidence

The sink is `admin.controller.js:65`. A fresh command-output proof was not re-run during invoice work.

### Why This Proves OS Command Injection

The user value is part of a shell command string, so shell metacharacters can append a second harmless command.

### Screenshot Opportunity

Capture the request and the returned local marker in the plain-text response.

## Attack #8 - Open Redirect

### Target

`POST /api/auth/login?next=`.

### Normal Request

Log in without `next` and receive the JSON login response.

### Malicious Test

Log in with a harmless local destination such as `next=http://127.0.0.1:5500/landing.html`.

### HTTP Response

The controller calls `res.redirect(req.query.next)` after successful authentication.

### Evidence

The sink is `auth.controller.js:39`. A fresh authenticated `Location` header was not re-run during invoice work.

### Why This Proves Open Redirect

The redirect destination is selected directly by the request query value.

### Screenshot Opportunity

Capture the login response with its `Location` header and the final local destination.

## Attack #9 - Information Disclosure

### Target

Any controlled application error reaching the global error handler.

### Normal Request

Request a normal valid endpoint.

### Malicious Test

Trigger a harmless controlled error, such as an invalid application-local operation that reaches the error handler.

### HTTP Response

The global handler returns JSON containing `stack: err.stack`.

### Evidence

The sink is `backend/src/middleware/errorHandler.js:18`. A fresh error response was not re-run during invoice work.

### Why This Proves Information Disclosure

The client receives internal file paths, function names, and line information instead of only a generic error.

### Screenshot Opportunity

Capture the response body with secrets redacted and the stack location visible.

## Invoice Functional Verification

### Normal Feature

A disposable local user was registered, product 4 was added with quantity 2, and checkout created order 9. The invoice request was:

`GET /api/users/invoice?orderId=9&name=John%20Doe`

Observed:

- HTTP 200.
- Page title: `Invoice #PX-00009 | Pixel Cart`.
- Customer name: `John Doe`.
- Product: `Arcade Controller`.
- Quantity: `2`.
- Unit price: `$29.99`.
- Subtotal: `$59.98`.
- Grand total: `$59.98`.
- Order status: `pending`.
- Print Invoice button present.
- Download Invoice link present.

The browser rendered the complete responsive invoice layout. `window.print()` is used for print and Save as PDF through native browser functionality.

### Download

`GET /api/users/invoice?orderId=9&name=John%20Doe&download=1`

Observed:

- HTTP 200.
- `Content-Disposition: attachment; filename="invoice-9.html"`.
- Downloaded response still contained the actual customer, product, and `$59.98` total.

### Access Control

- Authenticated request for another order: HTTP 404, `Invoice order not found`.
- After logout, invoice request: HTTP 401, `Authentication required`.

## SSTI Attack Against Invoice

The controlled request:

`GET /api/users/invoice?orderId=9&name=%3C%25%3D%207%20%2B%207%20%25%3E`

returned HTTP 200 and rendered `14` in the customer field while preserving the complete invoice. The raw EJS expression did not remain in the response. This is intentionally vulnerable behavior and must remain in the vulnerable version.

## Email-Update Removal

`POST /api/users/update-email` returned HTTP 404. Project search found no update-email route, updateEmail controller, email-change form, or email mutation query.

## Final Phase-18 Status

- Invoice route: verified.
- Database-backed order and item data: verified.
- Totals: verified against order 9.
- Normal invoice: verified.
- Print control and print CSS: verified in rendered page/source.
- Download attachment: verified.
- Ownership authorization: verified.
- Unauthenticated rejection: verified.
- SSTI arithmetic evaluation: verified and intentionally preserved.

The other vulnerability attack entries above retain honest phase boundaries: sinks previously identified as present are not relabeled as freshly exploited when their full attack was not repeated during invoice work.
