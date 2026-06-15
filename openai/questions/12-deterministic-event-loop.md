# 12. Deterministic Event-Loop Simulation

**Difficulty:** Medium → Hard
**Topics:** Heap, Virtual Clock, Discrete Event Simulation, Design
**Pattern:** Build a scheduler with a virtual clock → ordering guarantees

---

## ✅ Implement exactly

A class `EventLoop` with:
- `schedule(delay, callback) -> None` — fire `callback` at `now() + delay`
- `run() -> None` — advance the virtual clock, firing callbacks in time order until none remain
- `now() -> number` — current virtual time (starts at 0)

Pin: **deterministic** — ties (same fire time) break by **insertion order** (heap keyed `(time, seq)`). No real `sleep`; clock jumps to the next event. Callbacks may `schedule` more work during `run()`. `cancel` is an extension.

---

## Problem

Implement a single-threaded, deterministic event loop driven by a **virtual clock** (no real sleeping).

- `schedule(delay, callback)` — schedule `callback` to fire at `current_time + delay`.
- `run()` — advance the virtual clock and fire callbacks in time order until no events remain.
- `now()` — current virtual time.

A callback may itself call `schedule(...)` to enqueue future events.

---

### Example 1

```
loop = EventLoop()
order = []
loop.schedule(10, lambda: order.append("b"))
loop.schedule(5,  lambda: order.append("a"))
loop.schedule(5,  lambda: order.append("a2"))   # same time as "a"
loop.run()
# order == ["a", "a2", "b"]
# ties broken by insertion order (FIFO); "a" before "a2"
```

### Example 2 (callbacks schedule more work)

```
loop = EventLoop()
log = []
def tick(n):
    log.append((loop.now(), n))
    if n < 3:
        loop.schedule(1, lambda: tick(n+1))
loop.schedule(0, lambda: tick(1))
loop.run()
# log == [(0,1),(1,2),(2,3)]
```

---

### Constraints

- **Deterministic:** same input → same firing order every run. Break ties by insertion order.
- No real time / `sleep`; the clock jumps to the next event's time.
- Callbacks scheduled during `run()` are honored.

---

## Follow-up chain

1. **Heap by (fire_time, seq):** use a min-heap keyed on time with a monotonic sequence number for stable tie-breaking.
2. **Cancel:** `schedule` returns a handle; `cancel(handle)` prevents firing.
3. **Recurring timers:** `schedule_interval(period, cb)` re-arms itself.
4. **`run_until(t)`:** advance only up to time `t`, leaving later events pending.
5. **Why determinism matters:** tie this to testing async code (mock clock) — a recurring OpenAI theme.
