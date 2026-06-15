# 13. Debug a Broken LRU / Rate Limiter

**Difficulty:** Medium
**Topics:** Debugging, Reading Unfamiliar Code, Testing
**Pattern:** Given working-ish code with a bug → find it → write a failing test → fix

---

## ✅ Implement exactly (deliverable)

Given a buggy implementation, produce:
1. A **failing test** that deterministically reproduces the bug (ideally diffed against a reference model like `OrderedDict`).
2. The **minimal** corrected version (smallest change, not a rewrite).
3. A one-paragraph explanation of the root cause + what else you'd test.

Pin: preserve the original complexity guarantee (e.g. O(1) for LRU). State whether the original violated it.

---

## Problem

You are handed an existing implementation (LRU cache or rate limiter) that **mostly works but has a subtle bug**. Your job:

1. Read and understand the code.
2. Form a hypothesis about what's wrong.
3. **Write a failing test** that reproduces the bug.
4. Fix it with a minimal, correct change.
5. Explain why your fix is correct and what else you'd test.

Common planted bugs to recognize:

- **Off-by-one** in window/capacity (`>` vs `>=`, `<` vs `<=`).
- **Stale eviction:** updating an existing key doesn't refresh recency, so the wrong item is evicted.
- **Not removing the old node** before re-inserting (LRU), leaving duplicates in the linked list.
- **Window boundary:** fixed-window limiter resets at the wrong instant, allowing 2× burst at the edge.
- **Eviction order:** evicting from the wrong end of the structure.

---

### Example (buggy LRU — spot it)

```python
class LRU:
    def __init__(self, cap):
        self.cap = cap
        self.d = {}              # key -> value
        self.order = []          # least-recent at front

    def get(self, k):
        if k not in self.d:
            return -1
        self.order.append(k)     # BUG: doesn't remove old occurrence
        return self.d[k]

    def put(self, k, v):
        self.d[k] = v
        self.order.append(k)
        if len(self.d) > self.cap:
            old = self.order.pop(0)   # BUG: may evict a key that's still hot
            del self.d[old]           # BUG: may KeyError if already evicted
```

Failing test: after `put(1), put(2), get(1), put(3)`, key `2` should be evicted (it's LRU), but this code may evict `1`.

---

### Constraints

- Reproduce the bug with a deterministic test before fixing.
- Make the **smallest** correct change; don't rewrite from scratch unless asked.
- State the time complexity after your fix (and whether the original violated O(1)).

---

## Follow-up chain

1. **Generalize the test:** property-based / randomized testing comparing against a reference model (`OrderedDict`).
2. **Concurrency bug variant:** the planted bug is a missing lock — find the race.
3. **Performance regression:** the code is correct but O(n); restore O(1).
