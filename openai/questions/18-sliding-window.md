# 18. Sliding Window

**Difficulty:** Medium
**Topics:** Two Pointers, Hash Map, Sliding Window
**Pattern:** Fundamental — derive the window invariant, don't recite

---

## Problem

### Variant A — Longest Substring Without Repeating Characters

Given a string `s`, return the length of the longest substring with no repeating characters.

### Variant B — Longest Subarray with Sum ≤ K

Given an array of **non-negative** integers and an integer `K`, return the length of the longest contiguous subarray whose sum is ≤ `K`.

---

### Example 1 (no repeats)

```
Input:  s = "abcabcbb"
Output: 3            # "abc"

Input:  s = "bbbbb"
Output: 1            # "b"

Input:  s = "pwwkew"
Output: 3            # "wke"
```

### Example 2 (sum ≤ K)

```
Input:  nums = [1,2,1,0,1,1,0], K = 4
Output: 5            # e.g. [1,0,1,1,0] sums to 3, length 5
```

---

### Constraints

- O(n) time, single pass; each pointer moves forward only.
- State the window invariant explicitly (what the window always satisfies as you expand/contract).
- For Variant B, note that non-negativity is what makes the sliding window valid (with negatives you'd need prefix sums + deque).

---

## Follow-up chain

1. **Return the substring/subarray**, not just the length.
2. **At most K distinct characters:** longest substring with ≤ K distinct chars (map of counts, shrink when distinct > K).
3. **Exactly K distinct:** `atMost(K) - atMost(K-1)`.
4. **Negatives allowed (sum variant):** why the window breaks; switch to prefix sum + monotonic deque or sorted prefix.
5. **Streaming:** the array arrives as a stream — maintain the answer online.
