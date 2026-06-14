# 22. Serialize / Deserialize a KV Store ⭐

**Difficulty:** Medium
**Topics:** Encoding, Parsing, Edge Cases
**Pattern:** The "naive split breaks" problem — length-prefix encoding

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

## Follow-up chain

1. **Length-prefix (Redis RESP / netstring style):** `<len>:<payload>` — read the length, then read exactly that many bytes. No delimiter ambiguity.
2. **Escaping alternative:** escape the delimiter and the escape char; prove round-trip correctness.
3. **Streaming:** deserialize from a stream/socket where data arrives in chunks (you can't see the whole buffer at once).
4. **Versioning:** add a header so the format can evolve.
5. **Pairs with #21:** serialize a *time-based* KV store (multiple versions per key) to disk and reload it.
