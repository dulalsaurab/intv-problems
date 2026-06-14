# OpenAI Coding Interview — Question Bank

26 questions tuned to OpenAI's style: **build a small system → iterate → handle edge cases**.
They write *more* code than Meta/Google, layer follow-ups over 60–75 min, and grade
production-quality thinking (edge cases, locks, persistence, testing) — not one clever insight.

⭐ = recently reported as actually asked (2025–2026). Drill these first.

---

## A. Implementing Small Systems (the bread-and-butter — practice most)

**1. In-memory KV store → transactions** ⭐
`set/get/delete` → add TTL → nested `begin/commit/rollback`.
Core: dict + snapshot/undo stack. Follow: nested rollback, `count_by_value`.

**2. Rate limiter** ⭐
`allow_request(user, ts)`: fixed-window → sliding-window log → token bucket.
Core: `deque(maxlen)` per key, time math. Follow: per-tier limits, evict idle users.

**3. LRU cache → LFU**
O(1) `get/put`. Then LFU.
Core: `OrderedDict` (or hashmap+DLL). Follow: TTL + capacity combined.

**4. In-memory file system / Unix `cd`** ⭐
`mkdir/addFile/ls/readFile` → `find` by pattern → **`cd` with `.`/`..`/abs paths + symlink cycle detection**.
Core: tree of nodes, path parsing.

**5. Pub/sub broker**
`subscribe/publish` → wildcard topics → per-subscriber delivery.
Core: topic→subscribers map. Follow: replay last N to new subscriber.

**6. Metrics/event aggregation**
Ingest `(metric, value, ts)`; query `sum/avg/count` over window → sliding window → percentiles.
Core: bucketed time series. Follow: high-cardinality memory control.

**7. Versioned / snapshot store**
Every write makes a version; `get(key, version)`, `snapshot()`.
Core: copy-on-write, version stamps.

**8. Spreadsheet / cell dependency engine** ⭐
`set_cell("A1",5)`, `set_cell("A2","=A1+3")`; recompute dependents.
Core: DAG, topological recompute, **cycle detection (DFS)**. Follow: make `getCell` O(1) by pushing updates to dependents on write.

**26. In-memory SQL / ORM (built step-by-step)** ⭐
Tables, `insert`, `select` + `WHERE` → `JOIN`. The maximal version of #1.
Core: row store, predicate filtering, join logic.

---

## B. Concurrency & Async (explicitly tested — don't skip)

**9. Thread-safe bounded queue (producer/consumer)**
Blocking `put/get`, capacity, multiple producers/consumers.
Core: `Lock` + `Condition` (no busy-wait). Talk race conditions aloud.

**10. Task scheduler with dependencies**
Run tasks; some depend on others; run independent ones concurrently.
Core: topological sort + worker pool. Follow: failed task cancels dependents.

**11. Async rate-limited job runner with retries**
N coroutines, max concurrency K, exponential backoff, idempotency.
Core: `asyncio.Semaphore`, retry/backoff.

**12. Deterministic event-loop simulation**
`schedule(delay, cb)`, `run()` fires in order.
Core: heap by fire-time, virtual clock. Tests ordering guarantees.

**25. Multithreaded web crawler** ⭐
N threads, dedupe URLs, handle failures, stay in domain.
Core: `ThreadPoolExecutor` + thread-safe visited set + `queue.Queue`.

---

## C. Debugging / Improving Existing Code

**13. Debug a broken LRU / rate limiter**
Find off-by-one / stale-eviction / lock bug in given code.
Core: read unfamiliar code, hypothesize, write a failing test first.

**14. Fix a flaky concurrent counter**
Identify data race; fix with minimal correct lock.
Core: spot non-atomic read-modify-write.

---

## D. Simulation / State Modeling

**15. Grid simulation** — Game of Life, or robot-on-grid following commands.
Core: clean state, step function, no mutate-during-iteration.

**16. Elevator / vending machine state machine**
Core: `enum` states, transition table, process event stream.

**17. Parking lot / booking system**
Allocate/free spots of varying sizes; query availability.
Core: `@dataclass` modeling, clean API, hidden edge cases.

---

## E. Recently Reported Specials (high frequency)

**21. Time-based key-value store** ⭐⭐
`set(key,val,ts)`; `get(key,ts)` → latest value **at or before** ts.
Core: per-key sorted list + **`bisect`**. Follow: real timestamps + multithreading (global vs per-key lock vs optimistic), disk persistence.

**22. Serialize/deserialize a KV store** ⭐
Keys/values contain any char including the delimiter — naive `split` breaks.
Core: **length-prefix encoding** (`3:key5:value`, Redis protocol). Pairs with #21.

**23. Resumable iterator** ⭐
Pause/resume across calls, keep state, nested structures, `skip`/`reset`.
Core: generator / explicit state machine + saved position (`islice`).

**24. GPU credit management** ⭐
Time-based credits that expire; consume **soonest-to-expire first (FIFO)**.
Core: heap/queue keyed by expiry + timestamped ops.

---

## F. Fundamentals & Patterns (keep sharp, lower volume)

**18. Sliding window** — longest substring w/o repeats; max subarray ≤ K. Derive, don't recite.
**19. Graph traversal** — word ladder; reachability; BFS/DFS + topo sort + cycle detection. (Underpins #8, #10.)
**20. Streaming top-K / merge K sorted streams** — heap + generators, bounded memory.
**+ Intervals** — meeting rooms (overlap / min rooms) shows up as a warm-up.

---

## Highest-probability targets
#21, #22, #1, #8, #24, #25 — they hit OpenAI's exact patterns:
timestamped state, serialization edge cases, dependency graphs, expiry queues, concurrency.

## How they grade (internalize this)
- A working solution is **not enough** — show where locks go, how you'd persist/test it.
- One problem, **many sub-parts** — rehearse the *extension chains*, not just the base.
- **Think out loud**; declare your speed-vs-depth call in the first 60s.
- Write tests *as you go*; mock the clock/threads.

## Sources
- hellointerview.com/blog/openai-coding-questions
- medium.com/@anqi.silvia — 8 Coding Questions from the 2025 OpenAI Interview
- tryexponent.com/guides/openai-software-engineer-interview
- interviewquery.com/interview-guides/openai
