# 9. Thread-Safe Bounded Queue (Producer/Consumer)

**Difficulty:** Medium → Hard
**Topics:** Concurrency, Locks, Condition Variables, Design
**Pattern:** Build a blocking queue → multiple producers/consumers → no busy-wait

---

## Problem

Implement a thread-safe bounded blocking queue (do **not** just wrap `queue.Queue` — build it from a lock + condition variables).

- `BoundedQueue(capacity)` — fixed maximum size.
- `put(item)` — append an item. If the queue is **full**, block until space is available.
- `get()` — remove and return the oldest item. If the queue is **empty**, block until an item is available.
- `size()` — current number of items.

Must be correct with **multiple concurrent producers and consumers**, with **no busy-waiting** (use condition variables / wait-notify).

---

### Example 1

```
q = BoundedQueue(2)
# Producer thread:
q.put(1); q.put(2)
q.put(3)        # blocks until a consumer calls get()

# Consumer thread:
q.get()         -> 1   (unblocks the waiting put)
q.get()         -> 2
q.get()         -> 3
```

### Example 2 (FIFO under concurrency)

```
# 3 producers each put 1000 items, 3 consumers each get 1000 items.
# After join: every item produced is consumed exactly once, none lost or duplicated.
```

---

### Constraints

- No busy-wait / spin loops — block on a condition.
- Correct under spurious wakeups (re-check the predicate in a `while` loop).
- No deadlocks; no lost wakeups.

---

## Follow-up chain

1. **Talk race conditions aloud:** what breaks if you check "full" then `put` without holding the lock the whole time?
2. **`put`/`get` with timeout:** return `False` / raise if it can't proceed within `t` seconds.
3. **Graceful shutdown:** `close()` so blocked consumers wake and drain remaining items, then stop.
4. **Two condition variables vs. one:** why separate `not_full` and `not_empty` reduces spurious wakeups.
5. **Async version:** rebuild with `asyncio` (Conditions/Semaphores) instead of threads.
