# 29. Disease Spread in Flower Grid ⭐ (OAI-reported)

**Difficulty:** Hard
**Topics:** Multi-Source BFS, Threshold Propagation, Grid, Levels/Distance
**Pattern:** Build a small system → iterate (spread time → unreachable → containment) → edge cases
**Related:** #15 Grid Simulation (Game of Life), #19 Graph Traversal (BFS)

> **The OAI twist (differs from LeetCode 994):**
> 1. Disease spreads **8-directionally** (diagonals included), not just 4.
> 2. A healthy flower gets infected only when it has **at least `k` infected neighbors** — a **threshold**, not single-contact.
>
> The threshold is what makes this hard: you can **no longer mark a cell infected the first time a neighbor is infected.** You must track, per healthy cell, *how many* of its neighbors are infected, and flip it only when that count reaches `k`. With `k = 1` it degenerates back to ordinary multi-source BFS.

> **How this differs from #15:** Game of Life recomputes every cell from neighbor counts each tick with no notion of distance/time-to-reach. Here we want **minutes until full infection / reachability**, driven by a threshold-gated BFS frontier.

---

## ✅ Implement exactly (staged)

Grid is `list[list[int]]`: `0` = empty, `1` = healthy flower, `2` = infected flower.

- `min_time_to_infect(grid, k) -> int` — each minute, **simultaneously**, every healthy flower that currently has **≥ `k` infected 8-directional neighbors** becomes infected. Return the number of minutes until no healthy flower can change; **`-1`** if any healthy flower remains forever; `0` if there were no healthy flowers to start.

Pin:
- **8-directional** neighbors (the 8 surrounding cells); empty cells (`0`) are never infected and don't count as neighbors.
- **Simultaneous per minute:** a flower infected this minute only contributes to neighbors' counts *next* minute (snapshot the frontier — standard level-BFS discipline).
- Maintain a **per-healthy-cell count of infected neighbors**; infect when it reaches `k`. Don't re-scan the whole grid each minute.
- Terminates when a full minute passes with no new infection. If healthy flowers remain → `-1`.

Stages 2–3 (unreachable cells, containment) stack on this.

---

## Problem

Flowers are arranged in a grid. Some start infected; disease spreads to neighboring healthy flowers over time, but **only** when a flower has enough infected neighbors. Solve a chain of related questions.

### Stage 1 — Time to full infection (threshold + diagonal)
Return minutes until all healthy flowers are infected under the `k`-threshold, 8-directional rule, or `-1` if some never reach `k` infected neighbors.

### Stage 2 — Unreachable flowers
Return the flowers that can **never** accumulate `k` infected neighbors (the leftover `1`s when the spread stalls).

### Stage 3 — Containment
Barriers (turn a flower to `0`) can be placed to stop spread. Minimum barriers to protect a target region, or whether containment to a sub-region is possible. (Define the exact rule with the interviewer — intentionally open.)

---

### Example 1 (k = 1, behaves like ordinary 8-dir BFS)

```
grid = [[2,1,1],
        [1,1,0],
        [0,1,1]]
min_time_to_infect(grid, k=1) -> 2
# minute 1 (diagonals count): (0,1),(1,0),(1,1) all touch the source -> infected
# minute 2: (0,2) and (2,1) each now have an infected neighbor; (2,2) too
# all healthy gone after 2 minutes
```

### Example 2 (k = 2, threshold gates the spread)

```
grid = [[2,1,2],
        [1,1,1],
        [2,1,2]]
min_time_to_infect(grid, k=2) -> 1
# the center (1,1) has 4 infected diagonal neighbors >= 2 -> infected minute 1
# the edges (0,1),(1,0),(1,2),(2,1) each have 2 infected neighbors >= 2 -> infected minute 1
# everything flips in one minute
```

### Example 3 (k = 2, stalls -> -1)

```
grid = [[2,1,1],
        [1,1,1],
        [1,1,1]]
min_time_to_infect(grid, k=2) -> -1
# only one source; no healthy flower ever reaches 2 infected neighbors -> never fully infects
```

### Example 4 (nothing to infect)

```
min_time_to_infect([[0,2]], k=1) -> 0   # no healthy flowers
```

---

### Constraints

- Spread is **8-directional**; `0` cells block (not flowers, never infected, not counted).
- `k >= 1`. With `k = 1` this is plain multi-source BFS.
- **Simultaneous update each minute** — snapshot the current frontier before applying, so a same-minute infection doesn't cascade within the minute.
- Return `-1` iff the process reaches a fixed point with ≥ 1 healthy flower remaining.
- Don't double-count: once infected, a cell contributes to each neighbor's count exactly once.

---

## Key idea (state up front)

Threshold-gated multi-source BFS using a **neighbor-count map**:

```
infected_neighbors[r][c] = # of infected 8-neighbors of healthy cell (r,c)

1. Seed: for every initial 2, increment infected_neighbors of its healthy 8-neighbors.
2. frontier = every healthy cell whose count >= k.
3. Each minute (process the WHOLE frontier as one level):
     - mark all frontier cells infected (fresh -= 1 each)
     - for each newly infected cell, increment infected_neighbors of its
       still-healthy neighbors; any that *crosses* k (and isn't already
       queued/infected) joins the NEXT frontier
     - minutes += 1
4. Stop when frontier empties. Return -1 if fresh > 0 else minutes.
```

Why the count map: with a threshold you must know *how many* infected neighbors each healthy cell has, and update it incrementally as infections happen — exactly like Kahn's-algorithm in-degree, but the "in-degree" is "infected-neighbor count" and the gate is `>= k` instead of `== 0`. Guard against enqueuing the same cell twice as its count climbs past `k`.

Complexity: O(R·C) cells, each infection touches ≤ 8 neighbors → O(R·C) time, O(R·C) space.

---

## Follow-up chain (the "multiple related problems" — all have test cases)

1. **`-1` / unreachable set:** report exactly which flowers stall below `k`.
2. **Vary `k` at query time:** answer for several `k` without rebuilding from scratch?
3. **Weighted / directional spread:** diagonals cheaper/costlier → Dijkstra; or spread only in some directions.
4. **Per-source attribution / nearest source** with the threshold rule.
5. **Containment:** minimum barriers (`-> 0`) so a target region never reaches `k` — flooding / min-cut flavor.
6. **Dynamic:** sources or barriers added over time; recompute incrementally using the count map.
7. **Large/sparse grid:** store only flower cells + counts, not the dense grid.
