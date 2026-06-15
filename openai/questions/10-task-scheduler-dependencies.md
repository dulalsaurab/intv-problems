# 10. Task Scheduler with Dependencies

**Difficulty:** Hard
**Topics:** Graph, Topological Sort, Concurrency, Thread Pool
**Pattern:** Build DAG runner → run independent tasks concurrently → failure handling

---

## ✅ Implement exactly

A class `Scheduler(workers)` with:
- `add_task(task_id, fn, deps=[]) -> None` — `fn` is a **zero-arg** callable returning a result
- `run() -> dict[task_id, result]` — run all tasks; a task starts only after all `deps` complete; independent tasks run concurrently (≤ `workers`)

Pin: maximize parallelism (start a task the instant its deps finish — not in waves). Detect cycles / missing deps → raise. **Passing dependency results into `fn`** and **failure-cancels-dependents** are extensions.

---

## Problem

Implement a scheduler that runs tasks respecting dependencies, running independent tasks **concurrently**.

- `add_task(task_id, fn, deps=[])` — register a task with a callable and a list of task ids it depends on.
- `run()` — execute all tasks such that a task starts only after **all** its dependencies have completed. Tasks with no unmet dependencies run concurrently (up to a worker pool). Return the map of `task_id -> result`.

---

### Example 1

```
s = Scheduler(workers=4)
s.add_task("a", lambda: 1)
s.add_task("b", lambda: 2)
s.add_task("c", lambda deps: deps["a"] + deps["b"], deps=["a", "b"])
s.run()
# "a" and "b" run in parallel; "c" runs after both.
# results == {"a": 1, "b": 2, "c": 3}
```

### Example 2 (cycle)

```
s.add_task("x", fn, deps=["y"])
s.add_task("y", fn, deps=["x"])
s.run()   -> raises: cycle detected (cannot schedule)
```

---

### Constraints

- Maximize parallelism: a task must start as soon as its deps are done, not in artificial waves.
- Detect cycles / missing dependencies before or during scheduling.
- Bounded concurrency (worker pool of size K).

---

## Follow-up chain

1. **Topological execution with a worker pool:** track in-degree; when a task finishes, decrement dependents and enqueue any that hit zero.
2. **Failure cancels dependents:** if a task raises, its (transitive) dependents are skipped/cancelled; report which ran, failed, skipped.
3. **Retries:** retry failed tasks N times with backoff before giving up.
4. **Result passing:** pass dependency outputs into dependent tasks.
5. **Dynamic tasks:** a running task can add new tasks/deps — keep the scheduler correct.
