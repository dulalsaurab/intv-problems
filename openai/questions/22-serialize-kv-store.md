# 22. Serialize / Deserialize a KV Store ⭐ (OAI-verified)

**Difficulty:** Medium (base) → Hard (persistence/lifecycle follow-ups)
**Topics:** Encoding, Parsing, Edge Cases, Persistence
**Pattern:** The "naive split breaks" problem — length-prefix encoding
**Reported asked at OpenAI:** Mid-Apr, Late-Apr, Early-May 2026 (Mid-level, Senior, Staff)

---

## 🎯 Reported context (verified candidate notes — read first)

The base encode/decode is the easy part. **What actually got graded was the lifecycle + persistence discussion** — bring these up *proactively*, don't wait to be asked:

- **Lifecycle correctness:** *Can you call `serialize` twice in a row? `deserialize` twice? Why?* You must reason about idempotency and statefulness out loud, then adjust your code to match your reasoning. (A pure `serialize(dict)->str` is naturally idempotent; it gets interesting once serialize **persists** to storage — does a second call append? overwrite? corrupt?)
- **Persistence to a mock store:** interviewers handed candidates a **mock S3 `Bucket` class** and asked to persist/reload the serialized data through it.
- **Chunked upload:** large stores must be split into **fixed-size chunks** (e.g. 1 KB) with a **metadata record** (`total_chunks`) so deserialize knows when to stop. (See follow-up #6.)
- **Scope note (one report):** *no* timestamps / value history required here — that's the separate concern handled by **#21**. Don't over-build.

---

## ✅ Implement exactly

Two functions:
- `serialize(store: dict[str, str]) -> str`
- `deserialize(data: str) -> dict[str, str]`

Pin: `deserialize(serialize(d)) == d` for **all** dicts — including keys/values containing your delimiter, empty strings, and unicode. Use **length-prefix encoding** (`<len>:<payload>`), not naive `split`. If you encode to bytes, count **bytes** not characters.

---

## Problem

Implement serialization and deserialization for a key-value store where **keys and values may contain any character**, including whatever delimiter you might pick (e.g. `:`, `,`, newline, even null bytes).

- `serialize(store: dict[str, str]) -> str` (or `bytes`)
- `deserialize(data) -> dict[str, str]`

Round-trip must be exact: `deserialize(serialize(d)) == d` for **all** dictionaries, including keys/values containing your delimiter, empty strings, and unicode.

---

### Example 1 (the trap)

```
store = {"a": "1", "b": "2"}
# Naive: "a:1,b:2"  -> works
```

### Example 2 (why naive breaks)

```
store = {"a:b": "c,d", "": "x:y,z"}
# Naive "a:b:c,d,:x:y,z" is ambiguous — split(":")/split(",") corrupts it.
# A correct encoder round-trips this exactly.
```

### Example 3 (length-prefix encoding)

```
# Encode each string as  <len>:<bytes>
# {"a:b": "c,d"}  ->  "3:a:b3:c,d"
#                      ^len=3, key "a:b"; ^len=3, value "c,d"
deserialize("3:a:b3:c,d") -> {"a:b": "c,d"}
```

---

### Constraints

- Must handle: delimiter chars inside keys/values, empty keys/values, unicode (count **bytes**, not characters, if you encode to bytes), and large values.
- No ambiguity — the format must be self-describing.
- Don't rely on escaping that can itself be ambiguous unless you escape correctly and prove it.

---

## Reference encoding (length-prefix — `<len>:<payload>` per string)

```python
def serialize(kv: dict) -> str:
    if not kv:
        return ""                       # empty dict -> empty string
    out = []
    for k, v in kv.items():
        out.append(f"{len(k)}:{k}{len(v)}:{v}")   # e.g. "ab","xyz" -> "2:ab3:xyz"
    return "".join(out)

def _read_segment(s, pos):              # returns (data, new_pos)
    colon = s.index(":", pos)           # length runs up to the first ':'
    n = int(s[pos:colon])
    start = colon + 1
    return s[start:start + n], start + n  # read EXACTLY n chars -> no delimiter ambiguity

def deserialize(s: str) -> dict:
    kv, pos = {}, 0
    while pos < len(s):
        k, pos = _read_segment(s, pos)
        v, pos = _read_segment(s, pos)
        kv[k] = v
    return kv
```

Why it's unambiguous: the length tells you exactly how many chars to take, so a `:` (or newline, or digits) **inside** the data is read as data, never as structure. `0:` correctly encodes an empty string.

**Subtleties to call out:**
- **Bytes vs. chars:** `len()` + slicing here count Unicode *code points* and round-trip for `str`. If you encode to **bytes** (utf-8), count and slice **bytes**, or a multi-byte char will desync the parser.
- **Validate the length** before slicing (guard against a malformed/huge length on untrusted input).
- **Track position carefully** — the classic off-by-one is `start + n` vs `start + n + 1`.

---

## Follow-up chain

1. **Escaping alternative:** escape the delimiter and the escape char; prove round-trip correctness. (Length-prefix is cleaner — say why.)
2. **Lifecycle / idempotency (graded):** is `serialize` safe to call twice? `deserialize`? Once serialize **writes to storage**, define the semantics — overwrite vs. append — and make a double-call safe (idempotent write, or atomic replace).
3. **Persist to a mock S3 `Bucket`:** `bucket.put(key, bytes)` / `bucket.get(key)`. Write the serialized blob and reload it; handle "key not found" / empty bucket.
4. **Chunked persistence (large stores):** split the serialized bytes into fixed-size chunks (e.g. 1 KB), write a **metadata** object first (`{"total_chunks": N}`), then `data_chunk_0..N-1`. Reload by reading metadata, fetching chunks in order, reassembling.
   - **Atomic metadata write** so you never leave orphaned chunks.
   - **Last chunk is smaller** than the chunk size.
   - **Byte vs. char boundaries:** split on **bytes** (then decode utf-8 after reassembly) so you don't slice a multi-byte char in half.
5. **Streaming deserialize:** parse from a socket/stream where data arrives in pieces — you can't see the whole buffer; buffer until you have a full `<len>:<payload>`.
6. **Versioning:** add a format-version header so the encoding can evolve.
7. **Pairs with #21:** serialize a *time-based* KV store (multiple versions per key) and reload it.
