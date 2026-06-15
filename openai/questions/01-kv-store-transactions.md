# 1. In-Memory Key-Value Store with Transactions ⭐

**Difficulty:** Medium → Hard (with transactions)
**Topics:** Hash Map, Stack, Design
**Pattern:** Build a small system → iterate → handle edge cases

---

## ✅ Implement exactly

A class `KVStore` with:
- `set(key, value) -> None`
- `get(key) -> value | None` — `None` if absent
- `delete(key) -> None` — idempotent (no error if absent)
- `begin() -> None` — supports nesting
- `commit() -> bool` — `False` if no open txn (no-op, don't raise)
- `rollback() -> bool` — `False` if no open txn

Pin: `None` is a **legal value**, so use a sentinel for the delete tombstone (not `None`). Reads inside a txn see uncommitted writes of that txn and its parents.

---

## Problem

Design an in-memory key-value store that supports basic operations and **nested transactions**.

Implement a class `KVStore` with the following methods:

- `set(key, value)` — store `value` under `key`.
- `get(key)` — return the value for `key`, or `None` if it does not exist.
- `delete(key)` — remove `key` from the store.

Then extend it to support transactions:

- `begin()` — start a new transaction. Transactions may be **nested**.
- `commit()` — apply all changes made in the **innermost** open transaction to the enclosing scope (or the main store if it is the outermost). Return whether a transaction was open.
- `rollback()` — discard all changes made in the innermost open transaction. Return whether a transaction was open.

Reads (`get`) inside a transaction must reflect uncommitted writes made within that transaction (and its enclosing scopes).

---

### Example 1

```
kv = KVStore()
kv.set("a", 1)
kv.get("a")        -> 1

kv.begin()
kv.set("a", 2)
kv.get("a")        -> 2     # sees uncommitted write
kv.rollback()
kv.get("a")        -> 1     # rolled back

kv.begin()
kv.set("a", 3)
kv.commit()
kv.get("a")        -> 3     # committed
```

### Example 2 (nested)

```
kv = KVStore()
kv.set("x", 10)

kv.begin()
kv.set("x", 20)
kv.begin()
kv.set("x", 30)
kv.get("x")        -> 30
kv.rollback()      # discard inner
kv.get("x")        -> 20
kv.commit()        # apply outer
kv.get("x")        -> 20
```

### Example 3 (delete + rollback)

```
kv = KVStore()
kv.set("k", "v")
kv.begin()
kv.delete("k")
kv.get("k")        -> None
kv.rollback()
kv.get("k")        -> "v"
```

---

### Constraints

- `commit()` / `rollback()` with no open transaction should be a no-op (return `False`), not crash.
- Keys and values can be arbitrary hashable / storable objects.
- Aim for operations that are efficient; avoid copying the entire store on every `begin()`.

---

## Follow-up chain (expect these layered on)

1. **TTL:** add `set(key, value, ttl)` so keys expire after `ttl` seconds. `get` must treat expired keys as absent.
2. **`count_by_value(value)`** — return how many keys currently map to `value`, in better than O(n). Maintain a reverse index and keep it correct across transactions.
3. **Deep nesting performance:** ensure N levels of `begin` + a `commit` chain don't degrade to O(N·keys). Discuss layered diffs vs. undo log.
4. **Concurrency:** make it thread-safe. Where do locks go? Global lock vs. per-key? What happens to transaction isolation with multiple threads?
5. **Persistence:** how would you persist to disk and recover (append-only log / snapshot)?
