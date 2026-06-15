# 21. Time-Based Key-Value Store ⭐⭐

**Difficulty:** Medium → Hard
**Topics:** Hash Map, Binary Search (`bisect`), Concurrency, Design
**Pattern:** Highest-probability OpenAI question — timestamped state + extensions

---

## ✅ Implement exactly

A class `TimeMap` with:
- `set(key, value, timestamp) -> None`
- `get(key, timestamp) -> value | ""` — value with the **largest stored ts ≤ timestamp**; `""` if none

Pin: timestamps for a given key are **strictly increasing** (so `set` is append-only). `get` is **O(log n)** via `bisect` over the per-key timestamp list. Per-key history independent. (Out-of-order `set`, real clocks, locking, persistence are the graded **follow-ups**.)

---

## Problem

Design a key-value store that keeps **multiple timestamped versions** of each key and lets you read the value as of a given time.

- `set(key, value, timestamp)` — store `value` for `key` at `timestamp`. Timestamps for a given key are strictly increasing.
- `get(key, timestamp)` — return the value with the **largest stored timestamp ≤ `timestamp`**. If none exists, return `""` (or `None`).

---

### Example 1

```
store = TimeMap()
store.set("foo", "bar", 1)
store.get("foo", 1)     -> "bar"
store.get("foo", 3)     -> "bar"     # latest at-or-before 3
store.set("foo", "bar2", 4)
store.get("foo", 4)     -> "bar2"
store.get("foo", 5)     -> "bar2"
store.get("foo", 0)     -> ""        # nothing at or before 0
```

### Example 2

```
store.set("k", "v1", 10)
store.set("k", "v2", 20)
store.get("k", 15)      -> "v1"
store.get("k", 25)      -> "v2"
store.get("missing", 1) -> ""
```

---

### Constraints

- `set` is amortized O(1) (append, since timestamps increase).
- `get` is O(log n) via binary search over the per-key sorted timestamp list (`bisect`).
- Per-key history is independent.

---

## Follow-up chain (the part they actually grade)

1. **Real timestamps (not provided):** use a wall/monotonic clock inside `set`; what about two writes in the same tick?
2. **Multithreading — pick a locking strategy and defend it:**
   - global lock (simple, contended),
   - **per-key lock** (better parallelism across keys),
   - optimistic / lock-free reads (readers don't block; appends are the only mutation).
3. **`get` with out-of-order timestamps:** if `set` can arrive out of order, keep the list sorted (insert via `bisect.insort`) — now `set` is O(n).
4. **Disk persistence:** append-only log per key; recover on restart; snapshot + compaction.
5. **Memory growth / TTL:** evict versions older than a retention window.
6. **Range query:** return all values for a key in `[t1, t2]`.
