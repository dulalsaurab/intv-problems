# 20. Streaming Top-K / Merge K Sorted Streams

**Difficulty:** Medium → Hard
**Topics:** Heap, Generators, Bounded Memory
**Pattern:** Fundamental — heap + iterators, process without loading everything

---

## Problem

### Variant A — Streaming Top-K

Given a stream of elements (possibly huge / infinite) and an integer `K`, maintain the `K` largest elements seen so far using **bounded memory**.

- `add(x)` — ingest an element.
- `top_k()` — return the current `K` largest.

### Variant B — Merge K Sorted Streams

Given `K` iterators, each yielding elements in ascending order, produce a single iterator that yields all elements in **globally sorted order**, **lazily** (without materializing everything in memory).

---

### Example 1 (Top-K, K=3)

```
stream: 5, 1, 8, 2, 9, 3, 7
after all adds, top_k() -> [7, 8, 9]   (the 3 largest)
```

### Example 2 (Merge K)

```
streams = [iter([1,4,7]), iter([2,5,8]), iter([3,6,9])]
merge(streams) yields: 1,2,3,4,5,6,7,8,9
# never holds more than K elements (one per stream) in the heap at once
```

---

### Constraints

- Top-K: use a **min-heap of size K** — O(log K) per element, O(K) memory; do not sort the whole stream.
- Merge K: use a min-heap keyed on the current head of each stream; pull the next element from whichever stream you popped from.
- Merge must be lazy (a generator) — works on streams too large for memory.

---

## Follow-up chain

1. **Top-K by frequency:** most frequent K elements in a stream (count map + heap; or Count-Min Sketch for approximate at scale).
2. **Sliding-window top-K:** the K largest in the last `W` elements only.
3. **Distributed merge:** streams live on different machines — merge results from each shard's local top-K.
4. **Ties / stability:** define ordering for equal keys.
5. **K very large vs. very small:** when does sorting beat the heap?
