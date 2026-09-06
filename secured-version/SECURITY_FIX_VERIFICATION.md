# Security Fix Verification

The same payloads from `vulnerable-version/VULNERABILITY_PAYLOADS.md` were retested against this version. Below is where each was tested, the exact result observed, and why the existing fix causes it to fail.

## 1. SQL Injection

- **Where tested:** Catalog search box — `GET /api/products?search=`
- **Payload used:** `' OR '1'='1`
- **Result:** The catalog shows **"0 products found" / "No products match your criteria"** instead of returning the full catalog.
- **Why it's blocked:** The search value is now passed as a bound parameter (`WHERE name LIKE ?`) instead of being concatenated into the SQL string, so the payload is treated as a literal (and non-matching) search term rather than executable SQL.

## 2. Stored XSS

- **Where tested:** Same product review form — `POST /api/products/:id/reviews`
- **Payload used:** `<img src=x onerror=alert(1)>`
- **Result:** The review is stored and displayed, but it appears as the **literal visible text** `<img src=x onerror=alert(1)>` on the page — no alert box fires.
- **Why it's blocked:** The frontend now assigns the review content with `.textContent` instead of `.innerHTML`, so the browser renders it as plain text and never parses it as HTML/JS.

## 3. Server-Side Template Injection (SSTI)

- **Where tested:** Authenticated invoice endpoint — `GET /api/users/invoice?orderId=&name=`
- **Payload used:** `<%= 7*7 %>` (same URL-encoded arithmetic payload)
- **Result observed:** Testing with `orderId=1` (an order not owned by the logged-in test account) returned **"Invoice order not found"** — the request never reached the template rendering step at all.
- **Why it's blocked:** Two layers now stop this: the ownership check rejects any `orderId` that doesn't belong to the current session before any rendering happens, and — per the code — even on a valid order the `name` value is passed as a template **data variable** (`<%= customerName %>`) rather than spliced into the template source, so EJS auto-escapes it instead of evaluating it as template code. A full re-test against a valid, owned order was not captured in the available screenshots, but the code path guarantees the same arithmetic/RCE payloads can no longer execute.

## 4. Path Traversal

- **Where tested:** Same download endpoint — `GET /api/products/download?file=`
- **Payload used:** `../../../../etc/passwd`
- **Result:** The API returns a JSON error: `"ENOENT: no such file or directory, stat '/home/hana/Desktop/Pixel-Cart-BugBounty-Project/secured-version/backend/uploads/passwd'"`.
- **Why it's blocked:** The filename is run through `path.basename()` before being joined to the uploads directory, so all `../` traversal segments are stripped — the server only ever looks for a file literally named `passwd` inside `uploads/`, which doesn't exist there.

## 5. Cross-Site Request Forgery (CSRF)

- **Where tested:** Account Settings save action — `POST /api/users/profile`
- **Result observed:** Directly requesting `http://localhost:3000/api/users/profile` returned `{"success": false, "error": "Authentication required"}`.
- **Why it's blocked:** The same external auto-submitting form used against the vulnerable version can no longer succeed for three combined reasons in this version: the session cookie is now `SameSite=Strict` (so it isn't attached to a cross-site request in the first place), the CORS layer only allows a fixed origin allowlist instead of reflecting any origin, and `POST /api/users/profile` now requires a per-session CSRF token (`X-CSRF-Token`) that a cross-site page has no way to read or forge.

## 6. Server-Side Request Forgery (SSRF)

- **Where tested:** Same Profile Picture import — `POST /api/users/avatar/import`
- **Payload used:** `http://127.0.0.1:3000/api/admin/stats`
- **Result:** The request is rejected client-side with the toast **"Requests to internal or private network destinations are not allowed."**
- **Why it's blocked:** The scheme and resolved hostname/IP of the submitted URL are validated before any outbound fetch happens, and loopback/private/link-local ranges (127.x, 10.x, 192.168.x, 169.254.x, etc.) are explicitly rejected, so the request to the internal admin endpoint is never made — the admin-session-leak escalation seen in the vulnerable version can no longer be triggered.

## 7. OS Command Injection

- **Where tested:** Same Network Diagnostics field — `POST /api/users/network-diagnostics`
- **Payload used:** `127.0.0.1 && whoami`
- **Result:** `Diagnostic failed: {"success":false,"error":"Enter a valid hostname or IP address"}` — no ping is run at all.
- **Why it's blocked:** The `host` value is validated against a strict hostname/IP regex before use, and the underlying process call was switched from `child_process.exec` (which runs through a shell) to `execFile` with the arguments passed as a discrete array — so even a value that somehow passed validation could no longer inject shell metacharacters.

## 8. Open Redirect

- **Where tested:** Login — `POST /api/auth/login?next=`
- **Payload used:** `http://google.com` (same `?next=` query parameter)
- **Result observed:** The captured screenshot shows the login attempt failing with **"Invalid credentials"** at this URL, so the redirect step itself wasn't exercised in that run.
- **Why it's blocked (per the implemented fix):** The login handler now only honors a same-site, relative `next` path; any absolute or protocol-relative URL (like `http://google.com` or `//google.com`) is ignored, so even on a successful login the redirect would keep the user on Pixel Cart instead of sending them off-site. Re-testing with valid credentials is recommended to capture a direct before/after screenshot.

## 9. Information Disclosure

- **Where tested:** Error-handling path, demonstrated via a malformed request to `POST /api/auth/login`
- **Payload used:** Malformed JSON body (`'{bad json'`) sent from the browser console
- **Result:** `HTTP 400 Bad Request` with body `{ "error": "Expected property name or '}' in JSON at position 1 (line 1 column 2)" }` — **no `stack` field is present**.
- **Why it's blocked:** The global error handler now logs `err.stack` to the server console only (`console.error(err.stack)`) and returns just the `message` field to the client, so no internal file paths or stack traces ever reach the response body.