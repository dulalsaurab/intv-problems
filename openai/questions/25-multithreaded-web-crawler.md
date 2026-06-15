# 25. Multithreaded Web Crawler ⭐

**Difficulty:** Hard
**Topics:** Concurrency, Thread Pool, Thread-Safe Set, Queue, BFS
**Pattern:** N threads, dedupe URLs, handle failures, stay in domain

---

## ✅ Implement exactly

A function:
- `crawl(start_url, fetch, num_workers=N) -> set[str]` — `fetch(url) -> list[str]` returns linked URLs (mocked/provided)

Pin: crawl from `start_url` using `num_workers` threads; visit each URL **at most once** (thread-safe visited set); stay within the **same hostname** as `start_url`; a failing `fetch` must not kill or deadlock the crawl. **Terminate cleanly when all work is done** (not when the queue is momentarily empty) — that's the hard part.

---

## Problem

Implement a multithreaded web crawler.

- `crawl(start_url, fetch) -> set[str]` where `fetch(url) -> list[str]` returns the URLs linked from a page (provided/mocked).
- Crawl starting from `start_url`, following links, using **N worker threads**.
- **Visit each URL at most once** (dedupe).
- Stay within the **same hostname** as `start_url` (don't crawl external domains).
- Handle fetch **failures** gracefully (a failing page shouldn't kill the crawl or deadlock it).

---

### Example 1

```
graph = {
  "http://x.com/":     ["http://x.com/a", "http://x.com/b", "http://google.com/"],
  "http://x.com/a":    ["http://x.com/b", "http://x.com/"],
  "http://x.com/b":    ["http://x.com/a"],
}
crawl("http://x.com/", fetch=graph.get)
-> {"http://x.com/", "http://x.com/a", "http://x.com/b"}
# google.com excluded (different host); each x.com url visited once
```

---

### Constraints

- The **visited set must be thread-safe** (lock or concurrent structure) — the classic race is two threads checking "not visited" for the same URL simultaneously.
- No busy-waiting; workers idle when the queue is empty but the crawl isn't done.
- **Termination is the hard part:** know when *all* work is finished (no more URLs in flight) so workers exit cleanly — not when the queue is merely momentarily empty.

---

## Follow-up chain

1. **`ThreadPoolExecutor` + thread-safe visited + `queue.Queue`** — the canonical structure; or recursive `submit` of discovered links.
2. **Termination detection:** `queue.join()` with `task_done()`, or an in-flight counter; explain why "queue empty" alone is wrong.
3. **Politeness / rate limiting:** cap requests per host per second.
4. **Retries with backoff** on transient fetch failures.
5. **Async rewrite:** do it with `asyncio` + `aiohttp` instead of threads — when is async the better fit (I/O-bound)?
6. **Scale-out:** distribute the frontier across machines (shared visited set in Redis).
