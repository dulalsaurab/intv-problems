# 2. Rate Limiter ⭐

**Difficulty:** Medium → Hard
**Topics:** Hash Map, Queue/Deque, Design, Time
**Pattern:** Build a small system → iterate (fixed → sliding → token bucket)

---

## Problem

Design a rate limiter that decides whether a request from a given user should be allowed.

Implement `allow_request(user_id, timestamp) -> bool` that returns `True` if the request is allowed and `False` if it should be throttled.

Build it up in stages — the interviewer will ask you to evolve the algorithm:

1. **Fixed window:** allow at most `N` requests per user per fixed window of `W` seconds (e.g. windows `[0, W)`, `[W, 2W)`, …).
2. **Sliding window log:** allow at most `N` requests in the *trailing* `W` seconds from the current timestamp (no boundary bursts).
3. **Token bucket:** bucket holds up to `N` tokens, refills at `R` tokens/sec; each request costs 1 token.

`timestamp` is provided (monotonic, in seconds, may be fractional). Assume single-threaded unless asked otherwise.

---

### Example 1 (fixed/sliding window, N=3, W=10)

```
allow_request("u1", 0)    -> True   # 1
allow_request("u1", 1)    -> True   # 2
allow_request("u1", 2)    -> True   # 3
allow_request("u1", 3)    -> False  # over limit within window
allow_request("u1", 11)   -> True   # old requests aged out (sliding)
allow_request("u2", 3)    -> True   # different user, independent
```

### Example 2 (token bucket, N=2 capacity, R=1 token/sec)

```
allow_request("u1", 0.0)  -> True   # 2 -> 1 tokens
allow_request("u1", 0.1)  -> True   # 1 -> 0 tokens
allow_request("u1", 0.2)  -> False  # empty
allow_request("u1", 1.2)  -> True   # ~1 token refilled
```

---

### Constraints

- Many distinct users; per-user state must be independent.
- Timestamps are non-decreasing within a user (discuss if they aren't).
- Aim for O(1) amortized per request; don't scan all history each call.

---

## Follow-up chain

1. **Sliding window log → counter:** memory of the log grows with traffic. Use a `deque` of timestamps and pop expired entries; discuss sliding-window *counter* approximation to bound memory.
2. **Per-tier limits:** free vs. paid users have different `N`/`W`. Configurable limits per user/tier.
3. **Evict idle users:** the per-user map grows forever. How do you reclaim memory for users who stopped sending requests?
4. **Distributed:** multiple server instances share a limit — where does the state live (Redis)? Atomicity / race conditions.
5. **Concurrency:** make `allow_request` thread-safe with minimal contention (per-user lock vs. global).
