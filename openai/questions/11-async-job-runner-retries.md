# 11. Async Rate-Limited Job Runner with Retries

**Difficulty:** Hard
**Topics:** asyncio, Semaphore, Backoff, Idempotency
**Pattern:** Build async worker pool → bounded concurrency → retries/backoff

---

## ✅ Implement exactly

A coroutine:
- `async run_jobs(jobs, max_concurrency, max_retries) -> list` — `jobs` is a list of **zero-arg async callables**; returns results in **input order**

Pin: at most `max_concurrency` in flight (`asyncio.Semaphore`); on exception, retry up to `max_retries` more times with exponential backoff (`base * 2**attempt`) via `await asyncio.sleep`; if all attempts fail, the result slot holds the final exception object (don't raise out of the whole batch).

---

## Problem

Implement an async job runner that executes a batch of async jobs with **bounded concurrency** and **automatic retries**.

- `run_jobs(jobs, max_concurrency, max_retries)` where `jobs` is a list of async callables.
  - Run at most `max_concurrency` jobs at once.
  - If a job raises, retry it up to `max_retries` times with **exponential backoff** (e.g. `base * 2**attempt`, optionally jittered).
  - Return results in the **same order** as the input jobs (successes and final failures).

---

### Example 1

```
async def job_ok():   return "ok"
async def job_flaky(): ...   # fails twice, then succeeds

results = await run_jobs(
    [job_ok, job_flaky, job_ok],
    max_concurrency=2,
    max_retries=3,
)
# results == ["ok", "ok", "ok"]   (job_flaky succeeded on 3rd attempt)
# at no point were more than 2 jobs in flight
```

### Example 2 (exhausted retries)

```
async def job_bad(): raise ValueError("nope")
results = await run_jobs([job_bad], max_concurrency=1, max_retries=2)
# job attempted 3 times total, then result records the failure (exception/sentinel)
```

---

### Constraints

- Use `asyncio` — no thread pool. Concurrency capped by an `asyncio.Semaphore`.
- Backoff between retries must `await asyncio.sleep`, not block the loop.
- Results preserve input order regardless of completion order.

---

## Follow-up chain

1. **Idempotency:** if jobs have side effects, how do you avoid double-applying on retry (idempotency keys)?
2. **Per-job rate limit:** also cap requests/sec to a downstream service (token bucket on top of the semaphore).
3. **Jitter:** add randomized jitter to backoff to avoid thundering-herd retries.
4. **Cancellation / timeout:** cancel a job that exceeds a per-job timeout; cancel the whole batch on Ctrl-C cleanly.
5. **Progress / streaming:** yield results as they complete (in addition to the ordered final list).
