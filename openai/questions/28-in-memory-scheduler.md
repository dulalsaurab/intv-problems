# 28. In-Memory Job Scheduler ⭐

**Difficulty:** Medium → Hard
**Topics:** Heap (priority queue by run-time), Time, Concurrency, Design
**Pattern:** Build a small system → iterate (one-shot → recurring → cancel → threaded) → edge cases
**Related:** #12 Deterministic Event-Loop, #10 Task Scheduler w/ Deps, #24 GPU credits

> **How this differs from its neighbors:**
> - **#12 event loop** uses a *virtual* clock and just fires callbacks in order for deterministic simulation.
> - **#10 scheduler** is about *dependency ordering* (a DAG), not time.
> - **#28 (this one)** schedules jobs to run **at real/wall times or after delays**, supports **recurring** jobs and **cancellation**, and (in the hard version) runs them on a **background worker** — i.e. a mini `cron` / delayed-job executor.

---

## ✅ Implement exactly (staged)

A class `Scheduler` (pull-based core, injected clock) with:
- `schedule(fn, delay) -> job_id` — run zero-arg `fn` once, `delay` after now
- `schedule_at(fn, run_at) -> job_id` — run once at absolute `run_at`
- `schedule_recurring(fn, interval) -> job_id` — run every `interval` (first run at `now + interval`)
- `cancel(job_id) -> bool` — `False` if unknown/already done
- `run_pending(now) -> None` — execute every job due (`run_at <= now`) in time order; recurring jobs re-arm

Pin: min-heap keyed `(run_at, seq)`; lazy cancellation (mark + skip on pop); a job that raises must not stop the others. **Stage 4** (real-time background thread, no busy-wait) is the hard extension on top of this same heap.

---

## Problem

Design an in-memory scheduler that runs callables at specified times.

### Stage 1 — One-shot scheduling
- `schedule(fn, delay) -> job_id` — run `fn` once, `delay` seconds from now.
- `schedule_at(fn, run_at) -> job_id` — run `fn` once at absolute time `run_at`.
- `run_pending(now)` — execute every job whose scheduled time is `<= now`, in time order. (Pull-based: the caller drives the clock — easy to test deterministically.)

### Stage 2 — Recurring jobs
- `schedule_recurring(fn, interval) -> job_id` — run `fn` every `interval` seconds. After each run, re-arm for `last_run + interval`.

### Stage 3 — Cancellation
- `cancel(job_id) -> bool` — cancel a pending (or recurring) job so it won't fire again.

### Stage 4 — Background execution (the hard turn)
- Run jobs automatically on a background thread when their time comes, **without busy-waiting** — sleep until the next job is due, wake early if a sooner job is scheduled. `start()` / `stop()` for clean lifecycle.

---

### Example 1 (one-shot, pull-based clock)

```
s = Scheduler()
log = []
s.schedule(lambda: log.append("a"), delay=10)
s.schedule(lambda: log.append("b"), delay=5)
s.run_pending(now=4)    # nothing due yet -> log == []
s.run_pending(now=7)    # "b" (due at 5) fires -> log == ["b"]
s.run_pending(now=12)   # "a" (due at 10) fires -> log == ["b", "a"]
```

### Example 2 (recurring)

```
s = Scheduler()
ticks = []
jid = s.schedule_recurring(lambda: ticks.append(1), interval=5)  # due at 5,10,15,...
s.run_pending(now=12)   # fires at 5 and 10 -> ticks == [1, 1], next armed for 15
s.cancel(jid)
s.run_pending(now=100)  # cancelled -> no more ticks
```

### Example 3 (ordering / ties)

```
s.schedule(lambda: log.append("x"), delay=5)
s.schedule(lambda: log.append("y"), delay=5)   # same time
s.run_pending(now=5)    # ties broken by insertion order -> log == ["x", "y"]
```

---

### Constraints

- Use a **min-heap keyed on `(next_run_time, seq)`** — `O(log n)` insert, `O(1)` peek at the soonest job; `seq` is a monotonic counter for stable FIFO tie-breaking.
- `run_pending` pops only the jobs that are due; it must **not** scan all jobs.
- A recurring job must re-arm correctly (and not drift — decide: fixed-rate `last_due + interval` vs. fixed-delay `now + interval`).
- Cancellation must work even while a job sits in the heap (lazy deletion: mark cancelled, skip when popped — you can't cheaply remove from the middle of a heap).
- A job that raises must not kill the scheduler or skip other due jobs.

---

## Key idea (state up front)

Min-heap of `(run_at, seq, job)`. `run_pending(now)` = pop while `heap[0].run_at <= now`, run it, and if recurring, push it back with `run_at += interval`. Cancellation = a `cancelled` set checked on pop (lazy delete). Background mode = a worker thread that `wait`s on a `Condition` until `heap[0].run_at`, re-waking whenever a sooner job is added.

---

## Follow-up chain

1. **Heap + lazy cancellation:** why you mark-and-skip instead of removing from the heap's middle (`O(n)` search).
2. **Recurring drift:** fixed-rate vs. fixed-delay; what happens if a run takes longer than `interval`?
3. **Background thread, no busy-wait:** `Condition.wait(timeout = next_due - now)`; adding an earlier job must `notify()` to wake the sleeper. Classic bug: scheduling a sooner job while the worker sleeps on the old, later timeout.
4. **Thread safety:** lock around the heap; the worker holds it to peek/pop, releases it while *running* the job (so scheduling isn't blocked by a slow job).
5. **Priorities:** two jobs due at once but one is higher priority — extend the heap key.
6. **Max concurrency:** run due jobs on a worker pool with a cap (ties to #11).
7. **Persistence:** survive restart — persist pending jobs; how do you serialize a `fn`? (Discuss: store a named task + args, not the closure.)
