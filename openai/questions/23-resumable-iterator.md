# 23. Resumable Iterator ⭐

**Difficulty:** Medium → Hard
**Topics:** Iterators, Generators, State Machines
**Pattern:** Pause/resume across calls, keep state, nested structures

---

## ✅ Implement exactly

A class `ResumableIterator(data)` where `data` is a possibly-nested list (ints or sub-lists):
- `next() -> element` — next element in flattened order
- `has_next() -> bool` — **does not consume**; idempotent (one-element lookahead)
- `skip(n) -> None` — skip the next `n` elements
- `reset() -> None` — restart from the beginning

Pin: flatten lazily (don't pre-flatten a huge structure); `skip` past the end leaves `has_next() == False` (no crash). An explicit stack-based iterator handles `reset`/`peek` more cleanly than a generator — discuss the trade-off.

---

## Problem

Implement an iterator that can **pause and resume** across calls, preserving its position, with extra controls.

- `next()` — return the next element and advance.
- `has_next()` — whether more elements remain.
- `skip(n)` — skip the next `n` elements.
- `reset()` — restart from the beginning.

The input may be a **nested** structure (e.g. a list that can contain ints or other lists), iterated in flattened order.

---

### Example 1 (flatten nested + skip)

```
it = ResumableIterator([1, [2, 3], [4, [5, 6]], 7])
it.next()        -> 1
it.next()        -> 2
it.skip(2)       # skip 3 and 4
it.next()        -> 5
it.has_next()    -> True
it.next()        -> 6
it.next()        -> 7
it.has_next()    -> False
```

### Example 2 (reset)

```
it = ResumableIterator([10, 20, 30])
it.next()        -> 10
it.next()        -> 20
it.reset()
it.next()        -> 10
```

---

### Constraints

- `has_next()` must not consume an element, and calling it repeatedly must be idempotent (often needs a one-element lookahead / peek).
- Work lazily where possible — don't fully flatten a huge/infinite nested structure up front.
- `skip` past the end should leave `has_next() == False`, not crash.

---

## Follow-up chain

1. **Explicit state machine vs. generator:** a generator can't easily `reset`/`peek`; an explicit stack-based iterator over the nested structure can. Discuss the trade-off.
2. **Peek:** add `peek()` returning the next element without advancing.
3. **Serialize position:** save the iterator's position to a token and resume a *new* iterator from that token (`islice`-style) — true cross-process resume.
4. **Lazy nesting:** the structure contains generators/streams, not just lists — flatten without materializing.
5. **Bidirectional:** add `prev()` (now you need history).
