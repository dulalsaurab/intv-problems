# 14. Fix a Flaky Concurrent Counter

**Difficulty:** Medium
**Topics:** Concurrency, Data Races, Locks
**Pattern:** Identify a data race → fix with minimal correct synchronization

---

## ✅ Implement exactly (deliverable)

A class `Counter` with:
- `increment() -> None`
- `value() -> int`

Pin: must be **correct under many concurrent threads** — the `threads * iterations` assert must pass every run. Fix the read-modify-write race with a `Lock` (held only around `count += 1`). Be ready to explain why `+=` is non-atomic and to extend to per-key / sharded counters.

---

## Problem

You are given a counter that produces the **wrong total** when incremented from many threads. Find the data race and fix it with the minimal correct lock (without over-locking and killing throughput).

```python
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1     # BUG: read-modify-write is NOT atomic

    def value(self):
        return self.count
```

Demonstrate the bug: spawn many threads each calling `increment()` thousands of times; the final `value()` is less than `threads * iterations` due to lost updates.

---

### Example (the failing test)

```python
c = Counter()
threads = [Thread(target=lambda: [c.increment() for _ in range(100_000)])
           for _ in range(8)]
for t in threads: t.start()
for t in threads: t.join()
assert c.value() == 800_000   # FAILS: gets some smaller number
```

---

### Constraints

- Explain *why* `count += 1` is three operations (load, add, store) and how interleaving loses updates.
- Fix correctly: a `Lock` around the read-modify-write, or an atomic alternative.
- Don't hold the lock longer than necessary.

---

## Follow-up chain

1. **Per-key counters:** a map of counters incremented concurrently — global lock vs. per-key lock vs. sharded locks (striping).
2. **Read-heavy workload:** if reads vastly outnumber writes, consider a read/write lock or sharded counters summed on read.
3. **Lock-free option:** discuss atomics / CAS; in Python, the GIL nuance — why `+=` is still not atomic at the bytecode level.
4. **False sharing / contention:** why one global lock becomes the bottleneck and how striping helps.
