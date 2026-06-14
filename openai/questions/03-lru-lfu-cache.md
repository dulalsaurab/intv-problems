# 3. LRU Cache → LFU Cache

**Difficulty:** Medium → Hard
**Topics:** Hash Map, Doubly Linked List, Design
**Pattern:** Build O(1) cache → swap eviction policy

---

## Problem

### Part A — LRU Cache

Design a cache with a fixed `capacity` that evicts the **least recently used** item when full. Both operations must be **O(1)**.

- `get(key)` — return the value if present (and mark it most-recently-used), else `-1`.
- `put(key, value)` — insert/update. If over capacity, evict the least-recently-used key.

### Part B — LFU Cache

Now evict the **least frequently used** item. If there's a tie in frequency, evict the least-recently-used among them. Still **O(1)** for `get` and `put`.

- A `get` or `put` on an existing key increments its use frequency.

---

### Example 1 (LRU, capacity = 2)

```
put(1, 1)
put(2, 2)
get(1)      -> 1
put(3, 3)   # evicts key 2 (least recently used)
get(2)      -> -1
put(4, 4)   # evicts key 1
get(1)      -> -1
get(3)      -> 3
get(4)      -> 4
```

### Example 2 (LFU, capacity = 2)

```
put(1, 1)   # freq{1:1}
put(2, 2)   # freq{1:1, 2:1}
get(1)      -> 1        # freq{1:2, 2:1}
put(3, 3)   # evicts key 2 (lowest freq)
get(2)      -> -1
get(3)      -> 3        # freq{1:2, 3:2}
put(4, 4)   # tie freq among 1,3 -> evict LRU (key 1)
get(1)      -> -1
get(3)      -> 3
get(4)      -> 4
```

---

### Constraints

- `1 <= capacity`
- All operations strictly O(1) average.
- `capacity == 0` edge case should be handled.

---

## Follow-up chain

1. **TTL + capacity combined:** entries also expire after a TTL; eviction considers both staleness and recency/frequency.
2. **Thread safety:** make `get`/`put` safe under concurrent access. Where's the lock? Can you shard?
3. **Generic policy:** factor eviction into a strategy interface so LRU/LFU/FIFO are swappable.
4. **Stats:** expose hit rate / miss rate without breaking O(1).
