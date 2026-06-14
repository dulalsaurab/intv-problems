# Python Stdlib Cheat Sheet — OpenAI Interview Prep

One-line idiom per tool. If you can write each from a blank file in <15 min, you're ready.

---

## TIER 1 — reach for these constantly

### collections
| Tool | Signature / idiom | Wins |
|---|---|---|
| `defaultdict` | `defaultdict(list)`, `(set)`, `(int)`, `(dict)` | kills `if k not in d` |
| `deque` | `deque(maxlen=N)`; `append/appendleft/pop/popleft` O(1) | rate limiter, BFS, sliding window |
| `Counter` | `Counter(it)`; `.most_common(k)`; `+ - &` | top-K, freq counts |
| `OrderedDict` | `.move_to_end(k)`; `.popitem(last=False)` | LRU cache |

```python
class LRU:
    def __init__(self, cap): self.cap, self.d = cap, OrderedDict()
    def get(self, k):
        if k not in self.d: return -1
        self.d.move_to_end(k); return self.d[k]
    def put(self, k, v):
        if k in self.d: self.d.move_to_end(k)
        self.d[k] = v
        if len(self.d) > self.cap: self.d.popitem(last=False)
```

### heapq  (min-heap only; negate for max)
`heappush(h,x)` `heappop(h)` `heapify(l)` `heappushpop(h,x)` `nlargest/nsmallest(k,it)` `merge(*its)`
- Tuple trick: push `(priority, counter, item)` — monotonic counter avoids comparing items.
- Wins: GPU credits (soonest-expiry), task scheduler by fire-time, top-K, merge K streams.

### bisect  (the time-based KV trick)
`bisect_left/right(a, x)` `insort(a, x)`
```python
i = bisect.bisect_right(times, t) - 1   # latest entry <= t
```

---

## TIER 2 — cleanest tool for the job

### functools
`@cache` / `@lru_cache(maxsize=None)` — instant memoization · `reduce` · `partial` · `cmp_to_key`

### itertools
`chain` · `groupby` (pre-sort first!) · `accumulate` (prefix sums) · `islice` (slice an iterator) ·
`product/permutations/combinations` · `count/cycle` · `pairwise` (3.10+)

### dataclasses
`@dataclass` · `field(default_factory=list)` · `frozen=True` (hashable) · `order=True` (heap-friendly)

### string/parsing
`split` · `partition` (split on first delim) · `join` · for serialize (#22) use **length-prefix** `3:key5:value`, not split.

---

## TIER 3 — concurrency (explicitly tested)

### threading
`Lock` `RLock` `Condition` `Semaphore` `Event` · always `with lock:`
- `Condition.wait()/notify()` = bounded producer/consumer (no busy-wait).
- GIL: threads → I/O-bound (crawler). CPU-bound → `multiprocessing`.

### queue  (already thread-safe)
`Queue` `put/get/task_done/join` · `PriorityQueue` · `LifoQueue` — clean crawler answer.

### concurrent.futures
`ThreadPoolExecutor` → `submit` / `map` / `as_completed` · `ProcessPoolExecutor` (CPU-bound)

### asyncio
`async/await` · `run` · `gather` · `create_task` · `Semaphore` (max concurrency K) · `Queue` · `wait_for` (timeout)
- The *reasoning* "async vs threads" is the signal, not the syntax.

---

## TIER 4 — idioms that read as senior

- **Generators** `yield` / `yield from` — resumable iterators, streaming.
- **Context managers** `with`; `@contextlib.contextmanager`; `__enter__/__exit__` — lock guards, transactions.
- **Type hints** `dict[str,int]`, `Optional`, `Callable` — readable on shared screen.
- **enum.Enum** — explicit states for state machines.
- **time.monotonic()** (NOT time.time()) for elapsed/rate limiting; mockable.
- **pytest + unittest.mock** — mock the clock & threads; write 2–3 asserts.

---

## Module → problem map (drill these)
- `deque(maxlen=)` → rate limiter
- `bisect` → time-based KV
- `heapq` tuple trick → GPU credits
- `OrderedDict` → LRU
- `ThreadPoolExecutor` + `queue.Queue` → web crawler
- `asyncio.Semaphore` → rate-limited job runner
- `@dataclass` + `enum` → parking lot / elevator
- generator + `islice` → resumable iterator
