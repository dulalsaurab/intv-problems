# Cursor AppSec Interview — Vulnerability Code-Review Cheat Sheet

Format for every entry:
- **Vulnerable code** — what a planted bug looks like
- **Why it's an issue** — impact + how it's exploited
- **Local fix** — patch this instance
- **Systemic fix** — kill the whole vulnerability *class*

Frameworks merged: OWASP Top 10 (2021) + CWE/SANS Top 25 + OWASP LLM/Agent risks (relevant to Cursor).

In the live exercise, for each finding say: **What → Why (impact) → Severity → Local fix → Systemic fix.**

---

## 1. SQL Injection (CWE-89, OWASP A03)

```js
// VULNERABLE
app.get('/users', (req, res) => {
  const q = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  db.query(q, (e, rows) => res.json(rows));
});
// name = ' OR '1'='1  -> dumps all users;  '; DROP TABLE users;-- -> destruction
```
**Why:** untrusted input is concatenated into SQL. Attacker rewrites query logic → data theft, auth bypass, RCE in some DBs.
**Local fix:** parameterize.
```js
db.query('SELECT * FROM users WHERE name = ?', [req.query.name]);
```
**Systemic fix:** ban string-built SQL via lint rule; use an ORM/query builder everywhere; give the app DB user least privilege (no DROP/DDL); add SAST rule for raw query concatenation.

---

## 2. Broken Object-Level Authorization / IDOR (CWE-639, OWASP A01)

```js
// VULNERABLE
app.get('/api/orders/:id', auth, (req, res) => {
  res.json(db.orders.findById(req.params.id)); // never checks ownership
});
```
**Why:** authenticated user reads/edits *anyone's* object by changing the ID. The endpoint checks *authentication* but not *authorization*. Mass data scrape.
**Local fix:**
```js
const o = db.orders.findById(req.params.id);
if (!o || o.userId !== req.user.id) return res.sendStatus(404);
```
**Systemic fix:** centralized authorization/policy layer (e.g., `can(user, 'read', resource)`) enforced by default; scope every query by tenant/owner (`where userId = currentUser`); add an authz test per endpoint. This is the #1 real-world web bug — always look for it.

---

## 3. Broken Authentication / Session (CWE-287, OWASP A07)

```python
# VULNERABLE
if user.password == request.form['password']:  # plaintext compare, no rate limit
    login(user)
```
**Why:** plaintext/predictable comparison, no brute-force protection, no lockout. Credential stuffing succeeds.
**Local fix:** verify a hash with constant-time compare + rate limit.
```python
if bcrypt.checkpw(pw.encode(), user.pw_hash):
    login(user)
```
**Systemic fix:** use a vetted auth library/IdP; enforce MFA; rate-limit + account lockout; rotate session IDs on login; short-lived sessions with secure cookies.

---

## 4. Cross-Site Scripting — XSS (CWE-79, OWASP A03)

```jsx
// VULNERABLE (stored/reflected DOM XSS)
<div dangerouslySetInnerHTML={{ __html: comment.body }} />
// or: element.innerHTML = location.hash
```
**Why:** attacker-controlled HTML/JS runs in victim's browser → session theft, account takeover, keylogging.
**Local fix:** render as text, or sanitize.
```jsx
<div>{comment.body}</div>                  // React escapes by default
// if HTML truly needed: DOMPurify.sanitize(comment.body)
```
**Systemic fix:** context-aware output encoding by default in templating; strong **Content-Security-Policy** (no inline scripts) as defense-in-depth; ban `innerHTML`/`dangerouslySetInnerHTML` via lint; sanitize on output, not input.

---

## 5. Cross-Site Request Forgery — CSRF (CWE-352)

```js
// VULNERABLE: state-changing POST, cookie auth, no token
app.post('/account/email', auth, (req, res) => updateEmail(req.user, req.body.email));
```
**Why:** a malicious site auto-submits a form using the victim's cookies → actions performed as the victim. Key precondition: auth rides on a **cookie the browser sends automatically** cross-site.
**Local fix:** require an anti-CSRF token the attacker's site can't read (synchronizer or double-submit pattern).
```js
// Server issues a random token, ties it to the session, and checks it on writes.
const csrf = require('csurf');
app.use(csrf({ cookie: false }));              // token bound to the session
app.post('/account/email', auth, (req, res) => {
  // csurf middleware already rejected the request if req.body._csrf
  // didn't match the session token. Attacker's cross-site form can't
  // know the token (same-origin policy stops them reading it).
  updateEmail(req.user, req.body.email);
});
```
**Systemic fix:** make it safe by default at the cookie layer, then add defense in depth.
```js
// 1) SameSite stops the browser from attaching the auth cookie on cross-site POSTs
res.cookie('sid', id, { httpOnly: true, secure: true, sameSite: 'Lax' });
// 2) For JSON APIs prefer a header-based token (Authorization: Bearer ...) instead of
//    cookies — CSRF largely evaporates because the browser won't auto-send headers.
// 3) Require step-up re-auth for sensitive actions (password/email/payment changes).
```

---

## 6. Server-Side Request Forgery — SSRF (CWE-918, OWASP A10)

```python
# VULNERABLE
requests.get(request.args['url'])   # user controls the URL
```
**Why:** server fetches attacker-chosen URLs → hit internal services, cloud metadata (`http://169.254.169.254/`) to steal IAM creds, port-scan the VPC.
**Local fix:** allowlist schemes/hosts, *resolve the DNS yourself* and block private/link-local IPs, disable redirects (a redirect to `169.254.169.254` bypasses a hostname check).
```python
import ipaddress, socket
from urllib.parse import urlparse

def safe_fetch(url: str):
    u = urlparse(url)
    if u.scheme not in ("http", "https"):          # no file://, gopher://, etc.
        raise ValueError("bad scheme")
    ip = ipaddress.ip_address(socket.gethostbyname(u.hostname))  # resolve BEFORE fetching
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
        raise ValueError("blocked internal address")  # kills 169.254.169.254, 10.x, 127.x
    return requests.get(url, allow_redirects=False, timeout=5)  # no redirect = no bypass
```
**Systemic fix:** don't rely on app-layer checks alone — cut it off at the network and centralize.
```text
# 1) Egress firewall: the executor/app subnet has NO outbound by default; allowlist
#    only the few hosts it legitimately needs.
# 2) Cloud metadata: require IMDSv2 (token-based) and/or block 169.254.169.254 in the
#    network ACL so a missed app check still can't reach it.
# 3) One `safe_fetch` wrapper used everywhere; raw requests.get(user_url) is grep-banned.
```
> ⚠️ Note: the local check above still has a **TOCTOU/DNS-rebinding** gap — DNS can resolve to a
> safe IP at check time and a private IP at fetch time. The network-layer egress block is the
> real fix; app-layer validation is defense in depth.

---

## 7. Command Injection (CWE-78)

```js
// VULNERABLE
exec(`convert ${req.query.file} out.png`);   // shell metachars -> RCE
```
**Why:** shell interprets `;`, `|`, `$()` → arbitrary command execution on the server.
**Local fix:** avoid the shell; pass args as an array.
```js
execFile('convert', [req.query.file, 'out.png']);  // + validate filename
```
**Systemic fix:** never spawn shells with user input; use library APIs instead of CLIs; strict input validation/allowlists; run with least privilege in a sandbox/container.

---

## 8. Path Traversal (CWE-22)

```python
# VULNERABLE
return open(f"./uploads/{request.args['file']}").read()  # ../../etc/passwd
```
**Why:** `../` escapes the intended directory → read/write arbitrary files (configs, secrets, source).
**Local fix:** resolve and confine.
```python
base = Path("./uploads").resolve()
p = (base / name).resolve()
if not str(p).startswith(str(base)): abort(403)
```
**Systemic fix:** never build file paths from raw input; use opaque IDs mapped to stored paths; serve files from object storage with signed URLs; canonicalize + validate centrally.

---

## 9. Insecure Deserialization (CWE-502, OWASP A08)

```python
# VULNERABLE
data = pickle.loads(request.body)          # or yaml.load(...)
```
**Why:** deserializing untrusted bytes can instantiate objects / trigger gadget chains → RCE.
**Local fix:** use safe formats.
```python
data = json.loads(request.body)            # or yaml.safe_load
```
**Systemic fix:** never deserialize untrusted data with native formats; JSON/schema-validated DTOs only; sign+verify any serialized blobs you must accept; allowlist types.

---

## 10. Security Misconfiguration (OWASP A05)

```js
// VULNERABLE
app.use(cors({ origin: '*', credentials: true }));  // contradictory + unsafe
// DEBUG=true in prod; stack traces returned to client; default admin creds
```
**Why:** `origin:*` with credentials lets any site make authenticated cross-origin requests; debug leaks internals; defaults are guessable.
**Local fix:** reflect an allowlisted origin (never `*` with credentials); turn off debug; generic error pages.
```js
const ALLOWED = new Set(['https://app.example.com']);
app.use(cors({
  origin: (origin, cb) => cb(null, ALLOWED.has(origin)),  // echo back ONLY if allowlisted
  credentials: true,                                       // safe now: origin is constrained
}));
```
**Systemic fix:** make the secure config the default, enforced per environment.
```js
// One hardened baseline applied app-wide; environments differ only by config, not code.
app.use(helmet());                          // security headers everywhere (see §F)
app.disable('x-powered-by');                // stop advertising the stack
if (process.env.NODE_ENV === 'production') {
  app.set('json spaces', 0);                // no debug niceties in prod
}
// + config/IaC scanning in CI (tfsec/checkov), secrets from a vault, no default creds shipped.
```

---

## 11. Weak Password Storage / Crypto (CWE-916, CWE-327, OWASP A02)

```python
# VULNERABLE
hash = hashlib.md5(password.encode()).hexdigest()   # fast, unsalted, broken
```
**Why:** MD5/SHA-1/SHA-256 are *fast* → a GPU tries billions/sec; no salt → precomputed rainbow tables crack the whole table at once.
**Local fix:** a *slow*, salted KDF with a tunable work factor (the slowness is the feature).
```python
import bcrypt
# Store: salt is generated and embedded in the hash output automatically.
pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))  # rounds = work factor
# Verify: constant-time compare, baked into checkpw (no `==`).
if bcrypt.checkpw(attempt.encode(), pw_hash):
    login(user)
# argon2id is the modern preferred choice (memory-hard → resists GPU/ASIC):
#   from argon2 import PasswordHasher; ph = PasswordHasher(); ph.hash(pw); ph.verify(h, pw)
```
**Systemic fix:** centralize and stay crypto-agile.
```python
# One helper module wraps hashing so the algorithm/params live in ONE place.
# Store the algo + params alongside the hash (bcrypt/argon2 encode this in the string),
# so you can bump the work factor or migrate algorithms later without a flag day:
#   on successful login, if the stored hash is below current cost -> re-hash & save.
# Never roll your own crypto; for *encryption* (not passwords) use AEAD (AES-GCM)
# with keys from a managed KMS, never hardcoded.
```

---

## 12. Hardcoded Secrets / Sensitive Data Exposure (CWE-798, OWASP A02)

```js
// VULNERABLE
const STRIPE_KEY = "sk_live_abcd1234...";   // in source, shipped to client bundle
```
**Why:** secrets in git/history/frontend bundle = *permanent* leak (git history keeps it after you "delete" it; a minified bundle still ships to every browser) → account/financial compromise.
**Local fix:** load from the environment server-side; rotate the exposed key *immediately* (assume it's burned).
```js
// .env is gitignored; the key never appears in source or the client bundle.
const STRIPE_KEY = process.env.STRIPE_KEY;
if (!STRIPE_KEY) throw new Error('STRIPE_KEY not configured');  // fail fast, don't ship without it
// The frontend NEVER sees this — it calls YOUR backend, which calls Stripe.
```
**Systemic fix:** make committing a secret impossible, not just discouraged.
```yaml
# pre-commit hook + CI gate that BLOCKS the commit/PR on a detected secret:
#   - repo: https://github.com/gitleaks/gitleaks   (or trufflehog)
# Prod secrets live in a manager (Vault / AWS|GCP Secrets Manager), injected at runtime,
# with automatic rotation. Design rule: anything the browser receives is public —
# the backend holds keys and proxies privileged calls.
```

---

## 13. Mass Assignment / Over-Posting (CWE-915)

```js
// VULNERABLE
const user = await User.create(req.body);   // body has { isAdmin: true }
```
**Why:** attacker sets fields they shouldn't (role, balance, ownerId) → privilege escalation.
**Local fix:** allowlist fields.
```js
const { name, email } = req.body;
await User.create({ name, email });
```
**Systemic fix:** explicit DTOs/serializers with field allowlists; never bind request bodies straight to models; separate read/write schemas; deny unknown fields.

---

## 14. Missing Function-Level Authorization / Privilege Escalation (CWE-862, OWASP A01)

```js
// VULNERABLE
app.delete('/admin/users/:id', auth, (req, res) => deleteUser(req.params.id));
// auth checks logged-in, never checks role === admin
```
**Why:** any logged-in user reaches admin functionality. Vertical privilege escalation.
**Local fix:** `if (!req.user.isAdmin) return res.sendStatus(403);`
**Systemic fix:** role/permission checks enforced by middleware on whole route groups; default-deny routing; RBAC/ABAC policy layer; tests asserting non-admins get 403.

---

## 15. Open Redirect (CWE-601)

```js
// VULNERABLE
res.redirect(req.query.next);   // next=https://evil.com
```
**Why:** phishing (link looks like your trusted domain → bounces to attacker site); can leak OAuth tokens/codes in some flows.
**Local fix:** allow only same-site relative paths, or an explicit host allowlist.
```js
function safeRedirect(res, next) {
  // Must be a relative path starting with a single "/", NOT "//evil.com"
  // (protocol-relative) or "/\evil.com". Reject anything with a scheme/host.
  if (typeof next === 'string' && /^\/(?!\/)/.test(next)) {
    return res.redirect(next);
  }
  return res.redirect('/');   // fall back to a known-safe default
}
```
**Systemic fix:** never redirect to raw user input — indirect it through known keys.
```js
// Client sends a KEY, not a URL. Attacker can't point it anywhere you didn't list.
const DESTS = { dashboard: '/app', billing: '/app/billing' };
res.redirect(DESTS[req.query.to] ?? '/');   // one central helper used everywhere
```

---

## 16. XML External Entities — XXE (CWE-611)

```python
# VULNERABLE
tree = etree.parse(user_xml)   # default parser resolves external entities
```
**Why:** `<!ENTITY xxe SYSTEM "file:///etc/passwd">` → file read, SSRF, DoS (billion laughs entity expansion).
**Local fix:** turn off the dangerous parser features — entity resolution and network access.
```python
from lxml import etree
parser = etree.XMLParser(
    resolve_entities=False,   # don't expand &xxe; -> no file read / billion laughs
    no_network=True,          # external SYSTEM refs can't fetch -> no SSRF
    dtd_validation=False,
)
tree = etree.parse(user_xml, parser)
# Stdlib defusedxml is the drop-in safe alternative:
#   from defusedxml.ElementTree import parse   # hardened by default
```
**Systemic fix:** prefer JSON; if XML is unavoidable, make the hardened parser the only one.
```python
# Wrap parsing in ONE module that always uses the safe parser; ban raw etree.parse /
# minidom / xml.sax in review. defusedxml everywhere disables DTDs globally.
```

---

## 17. Unrestricted File Upload (CWE-434)

```js
// VULNERABLE
fs.writeFile(`./public/${file.originalname}`, file.buffer);  // shell.php uploaded & served
```
**Why:** upload executable/script into a web-served dir → RCE; or path traversal via filename (`../../`); or content-type spoofing (`.png` that's really PHP).
**Local fix:** verify magic bytes (not the client's extension/MIME), generate your own filename, store outside the webroot, mark non-executable.
```js
const crypto = require('crypto');
const { fileTypeFromBuffer } = require('file-type');

async function saveUpload(file) {
  const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg' };
  const type = await fileTypeFromBuffer(file.buffer);   // sniff REAL type from bytes
  if (!type || !ALLOWED[type.mime]) throw new Error('unsupported file type');
  const name = crypto.randomUUID() + ALLOWED[type.mime]; // OUR name -> no traversal, no .php
  const path = `/var/uploads/${name}`;                   // outside webroot -> never served as code
  await fs.promises.writeFile(path, file.buffer, { mode: 0o644 });  // not executable
  return name;
}
```
**Systemic fix:** get uploads off the app server entirely.
```text
# Uploads -> object storage (S3/GCS), served back via short-lived SIGNED URLs.
# The app server never stores or serves user files, so "upload a webshell" has no
# code-execution surface. Add: size limits (reject early), AV/type scanning,
# Content-Disposition: attachment so browsers download rather than render.
```

---

## 18. SSRF-via-Redirect / Improper Input Validation (CWE-20)

```python
# VULNERABLE
age = request.args['age']
db.execute(f"UPDATE u SET age={age} WHERE id={uid}")  # no validation + injection
```
**Why:** absent input validation underlies injection, logic abuse, overflow. Validate type, range, format, length at the boundary.
**Local fix:** parse/validate (`int(age)`, bounds) + parameterize.
**Systemic fix:** schema validation at every trust boundary (zod/pydantic); reject-by-default; centralize validation in request DTOs.

---

## 19. Improper Error Handling / Info Leak (CWE-209)

```python
# VULNERABLE
except Exception as e:
    return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
```
**Why:** stack traces/SQL errors leak schema, paths, versions → aids targeted attacks.
**Local fix:** log details server-side, return a generic message + error ID.
**Systemic fix:** global error handler; structured logging (no secrets/PII in logs); distinct dev vs prod verbosity; alerting on the logged details.

---

## 20. Missing Rate Limiting / Resource Exhaustion (CWE-770, CWE-307)

```js
// VULNERABLE
app.post('/login', (req, res) => checkPassword(...));  // unlimited attempts
```
**Why:** enables brute force, credential stuffing, OTP guessing, cost-based DoS (esp. expensive LLM calls).
**Local fix:** cap attempts per IP *and* per account (IP-only is bypassed by botnets; account-only enables lockout-DoS of a victim).
```js
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,                 // 15-minute window
  max: 5,                                    // 5 attempts per IP per window
  keyGenerator: (req) => req.ip + ':' + req.body.username,  // per IP+account pair
  handler: (req, res) => res.status(429).json({ error: 'too many attempts' }),
});
app.post('/login', loginLimiter, (req, res) => checkPassword(/* ... */));
```
**Systemic fix:** push limiting outward so app code can't forget it, and protect cost-sensitive paths.
```text
# Rate-limit + WAF at the gateway/edge (shared, distributed counter in Redis so it
# works across instances). Per-endpoint QUOTAS on expensive ops (model inference,
# report generation). CAPTCHA / step-up on abuse signals. Circuit breakers to shed load.
```

---

## 21. Vulnerable & Outdated Dependencies / Supply Chain (CWE-1104, OWASP A06)

```json
// VULNERABLE: package.json pinned to a known-CVE version; unverified transitive deps
"lodash": "4.17.4"
```
**Why:** known CVEs in deps are trivially exploited; typosquatted/compromised packages run arbitrary install scripts.
**Local fix:** upgrade; `npm audit fix`.
**Systemic fix:** SCA in CI (Dependabot/Snyk); lockfiles + integrity hashes; pin & review; minimize deps; SBOM; block install scripts where possible.

---

## 22. Security Logging & Monitoring Failures (OWASP A09, CWE-778)

```js
// VULNERABLE: no audit log on auth, authz failures, admin actions
```
**Why:** breaches go undetected; no forensics. Inability to detect = longer dwell time.
**Local fix:** emit a structured audit event on auth, authz denials, and sensitive actions — who/what/when/where — and *never* the secret itself.
```python
import logging, json
audit = logging.getLogger("audit")

def log_event(action, user_id, ok, req):
    audit.info(json.dumps({
        "action": action,            # "login", "delete_user", "authz_denied"
        "user_id": user_id,          # WHO (id, not password/token)
        "success": ok,               # WHAT happened
        "ip": req.client.host,       # WHERE from
        "ts": datetime.utcnow().isoformat(),  # WHEN
    }))
# log_event("authz_denied", user.id, False, request)  # on every 403
```
**Systemic fix:** centralize, protect, and act on the logs.
```text
# Ship to a centralized, append-only/tamper-resistant store (SIEM) with alerting +
# anomaly detection (e.g. spike in authz_denied = probing). Set a retention policy.
# Scrub secrets/tokens/PII at the logging boundary so they can never land in logs.
```

---

## 23. JWT / Token Flaws (CWE-347)

```js
// VULNERABLE
jwt.verify(token, secret, { algorithms: ['none'] });   // or no algo pin, weak secret
const payload = jwt.decode(token);                      // decode != verify!
```
**Why:** `alg:none` or `decode` skips signature check → forge any identity/role; weak secret is crackable.
**Local fix:** `jwt.verify(token, secret, { algorithms: ['HS256'] })`, strong secret, validate `exp`/`aud`/`iss`.
**Systemic fix:** central token helper that always verifies + pins algorithm; short TTL + rotation/revocation; asymmetric keys (RS256) for multi-service; never trust client claims without verification.

---

## 24. Race Condition / TOCTOU (CWE-362)

```python
# VULNERABLE
bal = get_balance(uid)
if bal >= amount:          # gap: concurrent requests both pass
    set_balance(uid, bal - amount)
```
**Why:** concurrent requests double-spend / bypass limits (e.g., redeem coupon twice).
**Local fix:** atomic DB op / row lock.
```sql
UPDATE accounts SET balance = balance - :amt WHERE id=:id AND balance >= :amt
```
**Systemic fix:** DB transactions + optimistic/pessimistic locking; idempotency keys on mutating endpoints; enforce invariants in the DB (constraints), not app code.

---

## 25. Prompt Injection / Insecure Agent Tooling — LLM01 (Cursor-critical)

```python
# VULNERABLE: agent runs whatever the model emits, on untrusted repo content
file_text = read_file(path)                 # README contains hidden instructions
plan = llm(f"Follow instructions:\n{file_text}")
os.system(plan.command)                     # indirect prompt injection -> RCE/exfil
```
**Why:** untrusted content (repo files, web pages, tool output) carries hidden instructions the model obeys → data exfiltration, secret theft, arbitrary command execution. Treat **LLM output as untrusted input**.
**Local fix:** never auto-execute model output; require explicit human approval; strip/segregate untrusted content from the instruction channel.
**Systemic fix:** least-privilege tools + sandboxing for agent actions; human-in-the-loop for high-risk ops (shell, network, file write); output filtering; keep secrets out of model context; allowlist tools per task; red-team with adversarial repos.

---

## Quick-recall checklist (skim during the exercise)
- [ ] Every input traced to its sink? (SQL/shell/file/HTML/redirect/deserialize)
- [ ] Every endpoint: authenticated **and** authorized (ownership + role)?
- [ ] Secrets in code/bundle? Crypto weak? Passwords hashed right?
- [ ] Output encoded (XSS)? CSP/CSRF/CORS/cookie flags set?
- [ ] User-controlled URLs (SSRF) / file paths (traversal) / filenames (upload)?
- [ ] Mass assignment? Input validated at the boundary?
- [ ] Errors leak info? Rate limiting? Dependencies current? Logging present?
- [ ] (AI) Untrusted content reaching the model? Output auto-executed?

## How to present (the part interviewers grade)
1. Group findings into **themes** (e.g., "systemic missing authorization"), don't just list.
2. Rank by **impact × exploitability**; say what you'd block release for.
3. Always give **local + systemic** fix.
4. State what you **couldn't verify** / would check with more time.
5. Add a **regression test / SAST rule** so the class can't return.
6. Show **false-positive discipline**: note what looks bad but is safe, and why.

---
---

# PART 2 — Beyond the Top Lists (code-review focused)

These are the things scanners miss and interviewers test. Same format: vulnerable code → why → local fix → systemic fix.

---

## A. BUSINESS-LOGIC FLAWS
*(No scanner finds these — they require reading the code's intent. Highest signal in a review.)*

### A1. Negative / zero quantity or amount
```js
// VULNERABLE
app.post('/cart/add', auth, (req, res) => {
  const { itemId, qty } = req.body;        // qty = -5
  const total = price(itemId) * qty;       // negative total -> account credited
  charge(req.user, total);
});
```
**Why:** developer assumed positive input. Negative qty refunds money; qty=0 may bypass stock checks. Integer overflow on `price*qty` can wrap to a tiny/negative total.
**Local fix:** `if (!Number.isInteger(qty) || qty < 1 || qty > MAX) return res.sendStatus(400);`
**Systemic fix:** schema validation (zod/pydantic) with min/max on every numeric input; use decimal money types; enforce non-negative invariants in the DB (`CHECK (qty > 0)`).

### A2. Client-supplied price / trusting client state
```js
// VULNERABLE
app.post('/checkout', auth, (req, res) => {
  charge(req.user, req.body.totalPrice);   // attacker sends totalPrice: 0.01
});
```
**Why:** never trust a value the client can change. Price, role, discount %, userId, `isPaid` must be derived server-side.
**Local fix:** recompute server-side from item IDs in the cart; ignore client price.
**Systemic fix:** principle — *server is the source of truth*; client sends intent (item IDs), never authoritative values; separate read DTO from write DTO.

### A3. Coupon / one-time token reuse
```python
# VULNERABLE
def redeem(code, user):
    c = Coupon.get(code)
    if c.valid:                 # never marked used; no per-user limit
        apply_discount(user, c)
```
**Why:** same coupon redeemed infinitely / by many users; gift-card double-spend.
**Local fix:** atomically mark used + check per-user.
```python
updated = Coupon.update().where(code=code, used=False).values(used=True)
if updated == 0: abort(409)     # already used (atomic)
```
**Systemic fix:** idempotency keys on mutating endpoints; uniqueness constraints in DB; treat redemption as a state machine.

### A4. Workflow / step skipping
```js
// VULNERABLE: each step is its own endpoint with no ordering check
POST /order/confirm   // reachable without ever calling /order/authorize-payment
```
**Why:** attacker calls the final step directly, skipping payment/verification.
**Local fix:** verify prerequisite state: `if (order.status !== 'PAYMENT_AUTHORIZED') return 409;`
**Systemic fix:** model multi-step flows as explicit server-side state machines; validate transitions; never rely on UI to enforce order.

### A5. Password reset / email change rebinding
```python
# VULNERABLE
def reset_password(token, new_pw, email):    # email taken from request!
    if valid_token(token):
        User.get(email).set_password(new_pw) # attacker passes victim's email
```
**Why:** token not bound to a specific user → reset anyone's password. Also: tokens that don't expire, aren't single-use, or email-change without re-auth/confirmation.
**Local fix:** derive the user *from the token*, not the request; expire + single-use tokens.
```python
user = user_for_token(token)   # token -> user mapping, server-side
```
**Systemic fix:** signed, short-lived, single-use, user-bound tokens; require current password / step-up auth for email & password changes; notify old email on change.

### A6. Insufficient funds / limit check race (TOCTOU restated as logic)
```python
# VULNERABLE
if user.points >= cost:
    user.points -= cost          # two concurrent redeems both pass
    grant_reward(user)
```
**Local fix:** atomic conditional update (see #24). **Systemic fix:** DB-level invariants + transactions; idempotency keys.

---

## B. STRIDE — apply it while reading each endpoint
For every handler, ask the six questions. This makes your review exhaustive and your language senior.

| Letter | Threat | Code-review trigger |
|---|---|---|
| **S** Spoofing | pretend to be another identity | weak/absent authn, forgeable tokens (#3, #23) |
| **T** Tampering | modify data/params | mass assignment, client-trusted values (#13, A2) |
| **R** Repudiation | deny an action | no audit log on sensitive actions (#22) |
| **I** Info disclosure | leak data | IDOR, verbose errors, secrets (#2, #12, #19) |
| **D** Denial of service | exhaust resources | no rate limit, unbounded query/upload (#20, GraphQL depth) |
| **E** Elevation of privilege | gain higher rights | missing function-level authz, mass-assigned role (#13, #14) |

Say it out loud: *"On this endpoint — who can spoof in? what can they tamper? is it logged? what leaks? can it be exhausted? can they escalate?"*

---

## C. FRAMEWORK FOOTGUNS
*(Same bug, different escape hatch. Know "safe by default, but here's the dangerous API.")*

### C1. React / Vue — the escape hatches
```jsx
// SAFE: React auto-escapes
<div>{userInput}</div>
// VULNERABLE: the escape hatches
<div dangerouslySetInnerHTML={{ __html: userInput }} />   // React
<div v-html="userInput" />                                 // Vue
<a href={userInput}>                                       // javascript: URLs -> XSS
```
**Fix:** render as text; if HTML required, `DOMPurify.sanitize()`. Validate `href` schemes (http/https only). **Systemic:** lint-ban these APIs; CSP.

### C2. Django ORM — parameterized by default, except…
```python
# SAFE
User.objects.filter(name=name)
# VULNERABLE: the raw escape hatches
User.objects.raw("SELECT * FROM users WHERE name='%s'" % name)
User.objects.extra(where=[f"name='{name}'"])
```
**Fix:** use the ORM, or pass params: `.raw("... WHERE name=%s", [name])`. **Systemic:** grep-ban `.raw(`/`.extra(`/`RawSQL` in review.

### C3. Express / Node — middleware & limits
```js
// VULNERABLE
app.use(bodyParser.json());                 // no size limit -> DoS
// auth middleware applied to SOME routes but not the new one (ordering bug)
app.get('/admin', adminPanel);              // forgot requireAdmin
// SAFE
app.use(bodyParser.json({ limit: '100kb' }));
app.use('/admin', requireAdmin);            // mount auth on the whole subtree
app.use(helmet());                          // security headers
```
**Systemic:** default-deny routing; auth on route *groups*, not per-handler; `helmet` globally.

### C4. Flask / FastAPI — Jinja & validation
```python
# VULNERABLE
render_template_string("Hello " + name)      # SSTI -> RCE
"{{ comment | safe }}"                        # disables escaping
@app.post("/u")
def create(data: dict): ...                   # 'dict' = no validation
# SAFE
return render_template("hello.html", name=name)   # autoescape on
class UserIn(BaseModel): name: str; email: EmailStr   # validated DTO
```
**Systemic:** never build templates from user input; Pydantic models (not `dict`) on every endpoint; `forbid` extra fields.

---

## D. AUTH / SESSION FLOWS

### D1. Session fixation (not rotating on login)
```js
// VULNERABLE
app.post('/login', (req, res) => {
  if (ok) req.session.user = user;          // keeps pre-login session id
});
// SAFE
req.session.regenerate(() => { req.session.user = user; });
```
**Why:** attacker fixes a victim's session ID before login, then rides it after.
**Systemic:** rotate session ID on every privilege change; `HttpOnly`+`Secure`+`SameSite`; idle + absolute timeouts.

### D2. OAuth / OIDC pitfalls
```js
// VULNERABLE: no state param -> CSRF on the callback; implicit flow leaks token in URL
GET /callback?code=...        // also: redirect_uri not allowlisted -> code theft
```
**Why:** missing `state` lets attacker inject their code; open `redirect_uri` leaks the auth code; implicit flow exposes tokens.
**Fix:** use authorization-code flow **+ PKCE**, validate `state`, strict `redirect_uri` allowlist, verify `id_token` signature/`aud`/`iss`/`nonce`.
**Systemic:** one vetted OAuth client lib; never hand-roll token validation.

### D3. Insecure "remember me" / predictable tokens
```python
# VULNERABLE
token = str(user.id) + "-" + str(int(time.time()))   # guessable/forgeable
```
**Fix:** `secrets.token_urlsafe(32)`, store a hash server-side. **Systemic:** all tokens from a CSPRNG; never derive from predictable fields.

---

## E. API-SPECIFIC (REST & GraphQL)

### E1. GraphQL — introspection + no depth/complexity limit
```graphql
# VULNERABLE: introspection on in prod (maps the whole schema)
# + nested query -> DoS
query { user { friends { friends { friends { ... } } } } }
```
**Fix:** disable introspection in prod; enforce **query depth + complexity limits**; paginate.
**Systemic:** field-level authorization (each resolver checks access — IDOR hides here); cost analysis; persisted queries.

### E2. GraphQL batching bypasses rate limits
```graphql
# VULNERABLE: 1000 login attempts in ONE request -> per-request rate limit useless
mutation { a: login(...) b: login(...) c: login(...) ... }
```
**Fix:** limit aliases/batch size; rate-limit by *operation count*, not request count.

### E3. Webhook without signature verification
```python
# VULNERABLE
@app.post("/webhook/stripe")
def hook(req):
    process(req.json)              # anyone can POST fake events
# SAFE
sig = req.headers["Stripe-Signature"]
event = stripe.Webhook.construct_event(req.body, sig, ENDPOINT_SECRET)  # HMAC verify
```
**Why:** unauthenticated webhook → forged "payment succeeded" events.
**Systemic:** verify HMAC signature + timestamp (replay window) on all inbound webhooks; idempotency on event IDs.

### E4. BOLA/BFLA at the API layer (OWASP API Top 10 #1/#5)
Same as IDOR (#2) and missing function-level authz (#14) — but APIs expose them more because clients hit endpoints directly. **Always re-check object + function authz on every API route.**

---

## F. WEB PLATFORM / SECURITY HEADERS
```js
// SAFE baseline (Express + helmet, or set manually)
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } },
}));
// Key headers and what they stop:
// Content-Security-Policy        -> limits XSS blast radius (no inline/eval)
// Strict-Transport-Security      -> forces HTTPS (HSTS)
// X-Content-Type-Options:nosniff -> stops MIME sniffing
// X-Frame-Options / frame-ancestors -> clickjacking
// Referrer-Policy                -> stops URL/token leakage via Referer
// Set-Cookie: HttpOnly; Secure; SameSite=Lax  -> XSS theft + CSRF
```
Be ready to explain the **mechanism**: *why* does `SameSite` stop CSRF? (browser won't attach the cookie on cross-site requests). *Why* does CSP help XSS? (blocks inline/injected scripts even if HTML injection succeeds — defense in depth, not a cure).

---

## G. SECURE-DESIGN PRINCIPLES (vocabulary for systemic fixes)
Drop these names when proposing class-level fixes — they signal seniority:
- **Least privilege** — minimal perms (DB user, IAM role, agent tools)
- **Defense in depth** — multiple layers (input validation *and* output encoding *and* CSP)
- **Fail securely / default-deny** — deny access unless explicitly allowed
- **Complete mediation** — check authz on *every* access, not just the first
- **Secure by default** — safe config out of the box; dangerous things opt-in
- **Separation of duties** — no single role can do everything
- **Minimize attack surface** — fewer endpoints, deps, and trust sinks
- **Server is source of truth** — never trust client-supplied authority values

---

## H. CURSOR-SPECIFIC ANGLE (one or two sentences = differentiator)
- **What leaves the machine / privacy mode** — what code/context is sent to the model; is it retained?
- **Secrets in context** — API keys/tokens in a user's repo can land in the model prompt or logs → scrub before sending.
- **MCP / tool trust model** — third-party tools extend the agent; least-privilege, allowlist, sandbox.
- **Indirect prompt injection** — malicious instructions hidden in repo files/web content the agent reads; treat all model output as untrusted, gate high-risk actions (shell/network/write) behind human approval.
