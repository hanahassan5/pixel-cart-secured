
## Application Under Test

- Base URL: `http://127.0.0.1:3000`
- Backend: Express with MySQL and session authentication
- Frontend: vanilla HTML/CSS/JavaScript
- Same seeded/local test data as the vulnerable-version verification

## Fix #1 - SQL Injection

### Target

`GET /api/products?search=`

### Malicious Test (repeated)

`GET /api/products?search=%27%20OR%201%3D1%20%23`

### Result

HTTP 200, but the response now returns an empty/normal filtered result instead of the full product collection.

### Fix Applied

`product.controller.js` now builds the query as `SELECT * FROM products WHERE name LIKE ?` and passes `` `%${filters.search}%` `` as a bound parameter via `pool.query(query, [searchValue])`. The payload is treated as a literal search string, not as SQL.

### Verdict

**Fixed.** The tautology no longer changes query behavior.

## Fix #2 - Stored XSS

### Target

`POST /api/products/4/reviews`, then product page review rendering.

### Malicious Test (repeated)

Submit the same harmless local marker script used in the vulnerable-version test as review content.

### Result

The review text is displayed literally on the page (e.g. as visible `<script>...</script>` text) instead of executing.

### Fix Applied

`frontend/js/product.js:268` now assigns the stored review value with `card.querySelector(".review-body").textContent = review.content` instead of `.innerHTML`. The browser renders it as plain text, so it can no longer reach the DOM as executable HTML.

### Verdict

**Fixed.** The stored payload no longer executes in the browser.

## Fix #3 - SSTI Against Invoice

### Target

Authenticated `GET /api/users/invoice?orderId=9&name=`

### Malicious Test (repeated)

`GET /api/users/invoice?orderId=9&name=%3C%25%3D%207%20%2B%207%20%25%3E`

### Result

HTTP 200. The invoice renders normally, and the customer field shows the literal text `<%= 7 + 7 %>` (URL-decoded/escaped), not the evaluated result `14`.

### Fix Applied

`user.controller.js` no longer splices the query value into the EJS template source before rendering. It now calls `ejs.render(source, { invoice, customerName })`, passing the user-supplied name as a **data variable**. `invoice.ejs` prints it with `<%= customerName %>`, which EJS auto-escapes as plain output — the string is never re-parsed as template syntax.

### Verdict

**Fixed.** Attacker-supplied template syntax is no longer evaluated by the server.

## Fix #4 - Path Traversal

### Target

`GET /api/products/download?file=`

### Malicious Test (repeated)

`GET /api/products/download?file=../src/views/invoice.ejs`

### Result

HTTP 400 `{"success": false, "error": "Invalid file path"}` (or the file is silently reduced to a bare filename inside the uploads folder, which then 404s if it doesn't exist there).

### Fix Applied

`product.controller.js` now runs the requested name through `path.basename(filename)` before joining it to `UPLOADS_ROOT`, stripping any `../` or directory components, and then verifies the resolved path is still contained inside `UPLOADS_ROOT` before calling `res.download`.

### Verdict

**Fixed.** The request can no longer escape the uploads directory.

## Fix #5 - CSRF

### Target

Authenticated `POST /api/cart` from a second local origin.

### Malicious Test (repeated)

Send the same cross-origin preflight/POST from an untrusted local origin (e.g. an origin not in the allowlist, such as `http://127.0.0.1:6000`).

### Result

The preflight/response no longer includes `Access-Control-Allow-Origin` for the untrusted origin, and the browser blocks the cross-origin request before the session cookie is used. The session cookie itself is now `SameSite=Strict`, so it is not attached to cross-site requests at all.

### Fix Applied

`app.js` — the CORS middleware now checks the request origin against an explicit `ALLOWED_ORIGINS` list and only sets CORS headers for a match (no more reflecting any origin, no more wildcard fallback). The session cookie config was changed from `sameSite: false` to `sameSite: "strict"`.

### Verdict

**Fixed.** An untrusted origin can no longer make a credentialed cross-origin state-changing request.

## Fix #6 - SSRF

### Target

Admin `POST /api/admin/image`.

### Malicious Test (repeated)

Submit a loopback/internal URL as `url`, e.g. `http://127.0.0.1:3000/api/admin/stats` or `http://169.254.169.254/`.

### Result

HTTP 400 `{"success": false, "error": "Requests to internal addresses are not allowed"}`.

### Fix Applied

`admin.controller.js` now parses the submitted URL, rejects any scheme other than `http:`/`https:`, and rejects hostnames resolving to loopback, private, or link-local ranges (`127.x`, `10.x`, `192.168.x`, `169.254.x`, `172.16-31.x`, `localhost`, `::1`) before making the outbound request. `maxRedirects: 0` prevents a redirect-based bypass of the check.

### Verdict

**Fixed.** Requests to internal/loopback targets are rejected before any outbound call is made.

## Fix #7 - OS Command Injection

### Target

Admin `POST /api/admin/ping`.

### Malicious Test (repeated)

Submit the same shell metacharacter payload used in the vulnerable-version test, e.g. `127.0.0.1 && echo pwned`.

### Result

HTTP 400 `{"success": false, "error": "Invalid IP address"}` — the request is rejected before any command runs.

### Fix Applied

`admin.controller.js` now validates `req.body.ip` against a strict IPv4 regex before use, and replaced `child_process.exec("ping " + ... )` (string-based, runs through a shell) with `execFile("ping", [flag, "2", ip], ...)`, which passes arguments as an array and never invokes a shell — so even if a value passed the regex, shell metacharacters would not be interpreted.

### Verdict

**Fixed.** Shell metacharacters can no longer be injected into the executed command.

## Fix #8 - Open Redirect

### Target

`POST /api/auth/login?next=`

### Malicious Test (repeated)

Log in with `next=https://example.com` (external) and `next=//example.com` (protocol-relative).

### Result

Both are rejected/ignored; the login response no longer redirects off-site. Only a same-site path such as `next=/profile.html` is honored.

### Fix Applied

`auth.controller.js:38` changed the condition from `if (req.query.next)` to `if (req.query.next && req.query.next.startsWith("/") && !req.query.next.startsWith("//"))`, so only relative, same-origin paths are accepted as redirect targets.

### Verdict

**Fixed.** External and protocol-relative redirect targets are no longer honored.

## Fix #9 - Information Disclosure

### Target

Any controlled application error reaching the global error handler.

### Malicious Test (repeated)

Trigger the same harmless controlled error used in the vulnerable-version test.

### Result

The JSON error response contains only `{"success": false, "error": "<message>"}` — no `stack` field, no file paths, no line numbers.

### Fix Applied

`errorHandler.js` now logs `err.stack` server-side with `console.error(err.stack)` and no longer includes it in the response body sent to the client.

### Verdict

**Fixed.** Internal stack traces are no longer exposed to the client.

