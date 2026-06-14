# 6. Metrics / Event Aggregation

**Difficulty:** Medium → Hard
**Topics:** Time Series, Bucketing, Heap, Design
**Pattern:** Ingest stream → window queries → percentiles → bound memory

---

## Problem

Design a system that ingests timestamped metric samples and answers aggregate queries over time windows.

- `record(metric, value, timestamp)` — ingest a sample.
- `query(metric, agg, start, end)` — return the aggregate (`"sum"`, `"avg"`, `"count"`, `"min"`, `"max"`) of all samples for `metric` with `start <= timestamp < end`.

Then add:

- `query_window(metric, agg, now, window)` — aggregate over the trailing `window` seconds ending at `now` (sliding window).
- `percentile(metric, p, start, end)` — the p-th percentile (e.g. p95) of values in the range.

---

### Example 1

```
m = Metrics()
m.record("latency", 100, 1)
m.record("latency", 200, 2)
m.record("latency", 300, 3)
m.query("latency", "sum", 1, 4)     -> 600
m.query("latency", "avg", 1, 4)     -> 200
m.query("latency", "count", 2, 4)   -> 2     # ts 2 and 3
```

### Example 2 (sliding window, now=10, window=5)

```
# samples at ts 4,6,8,9 -> only 6,8,9 fall in (5,10]
m.query_window("latency", "count", now=10, window=5) -> 3
```

### Example 3 (percentile)

```
# values 10,20,30,...,100 in range
m.percentile("latency", 95, start, end) -> 95 (or 100, define your convention)
```

---

### Constraints

- High ingest rate; `record` should be ~O(1) or O(log n).
- Range queries should be much better than scanning all samples.
- Be explicit about inclusive/exclusive bounds and your percentile interpolation convention.

---

## Follow-up chain

1. **Bucketed time series:** pre-aggregate into fixed-size time buckets (e.g. per-second) so range queries sum a few buckets. Discuss precision vs. memory trade-off.
2. **Sliding window:** maintain a rolling structure that evicts expired buckets.
3. **Percentiles at scale:** exact percentiles need all values; discuss approximate sketches (t-digest / HDR histogram) for bounded memory.
4. **High cardinality:** millions of distinct metric names — how do you cap memory and evict cold metrics?
5. **Out-of-order / late samples:** what if a sample arrives with a timestamp in the past?
