# 15. Grid Simulation (Game of Life / Robot on a Grid)

**Difficulty:** Medium
**Topics:** Matrix, Simulation, State Stepping
**Pattern:** Model a grid → step function → no mutate-during-iteration

---

## ✅ Implement exactly (drill target: Variant A — Game of Life)

- `step(board) -> new_board` — `board` is `list[list[int]]` (1=live, 0=dead); return the **next** generation
- `simulate(board, generations) -> board` — apply `step` N times

Pin: **all cells update simultaneously** (an updated cell must not affect its neighbors in the same generation); cells outside the grid count as dead. (Variant B — robot on grid — is the alternate; pick A for the drill.)

---

## Problem

### Variant A — Conway's Game of Life

Given an `m x n` board of cells (`1` = live, `0` = dead), compute the **next** state. Each cell updates simultaneously based on its 8 neighbors:

1. A live cell with < 2 live neighbors dies (underpopulation).
2. A live cell with 2 or 3 live neighbors lives on.
3. A live cell with > 3 live neighbors dies (overpopulation).
4. A dead cell with exactly 3 live neighbors becomes live (reproduction).

- `step(board) -> next_board`
- `simulate(board, generations) -> board after N generations`

### Variant B — Robot on a Grid

A robot starts at `(0,0)` facing North and follows a command string of `G` (go forward 1), `L` (turn left 90°), `R` (turn right 90°). Return its final position and facing. (Optionally: detect if it's bounded in a cycle.)

---

### Example 1 (Game of Life)

```
Input:
[[0,1,0],
 [0,0,1],
 [1,1,1],
 [0,0,0]]

Output (next generation):
[[0,0,0],
 [1,0,1],
 [0,1,1],
 [0,1,0]]
```

### Example 2 (Robot)

```
commands = "GGRGG"
start (0,0) facing N
-> moves to (0,2), turns R (now facing E), moves to (2,2)
final: position (2,2), facing E
```

---

### Constraints

- **All cells update simultaneously** — do not let an updated cell affect its neighbors in the same generation.
- Handle edges/corners (neighbors outside the grid count as dead).
- Clean separation of state and the step function.

---

## Follow-up chain

1. **In-place O(1) extra space (Game of Life):** encode both old and new state in each cell using 2 bits (e.g. value `2` = was dead, now live; `3` = was live, now dead), then a second pass to finalize.
2. **Infinite board:** the grid is unbounded; store only live cells in a set and compute neighbors lazily.
3. **Sparse / very large board:** memory-efficient representation.
4. **Robot: bounded-in-circle** detection (returns to origin or never faces North after one cycle).
