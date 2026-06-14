# 8. Spreadsheet / Cell Dependency Engine ⭐

**Difficulty:** Hard
**Topics:** Graph, Topological Sort, Cycle Detection (DFS), Design
**Pattern:** Build cells → formula references → recompute DAG → cycle detection

---

## Problem

Design a spreadsheet engine that supports cells holding literal values or formulas that reference other cells.

- `set_cell(cell, value)` — set a cell. `value` is either:
  - a number (e.g. `5`), or
  - a formula string starting with `=` referencing other cells (e.g. `"=A1+A2"`, `"=A1*B1+3"`).
- `get_cell(cell)` — return the cell's computed value.

When a cell's value changes, **all cells that (transitively) depend on it must reflect the new value**.

---

### Example 1

```
sheet = Spreadsheet()
sheet.set_cell("A1", 5)
sheet.set_cell("A2", "=A1+3")
sheet.get_cell("A2")    -> 8
sheet.set_cell("A1", 10)
sheet.get_cell("A2")    -> 13     # dependent recomputed
```

### Example 2 (chained dependencies)

```
sheet.set_cell("A1", 1)
sheet.set_cell("A2", "=A1+1")
sheet.set_cell("A3", "=A2+A1")
sheet.get_cell("A3")    -> 3
sheet.set_cell("A1", 10)
sheet.get_cell("A3")    -> 21     # A2=11, A3=21
```

### Example 3 (cycle detection)

```
sheet.set_cell("A1", "=A2")
sheet.set_cell("A2", "=A1")   -> raises / returns error: cycle detected
```

---

### Constraints

- Support `+`, `-`, `*`, `/` and parentheses (define your scope explicitly up front).
- Setting a formula that would create a cycle must be rejected, leaving prior state intact.
- Referencing an empty cell defaults to 0 (state your convention).

---

## Follow-up chain

1. **Cycle detection (DFS):** detect and reject cycles when a formula is set.
2. **Efficient recompute:** on a write, recompute only the affected sub-DAG in topological order — not the whole sheet.
3. **O(1) `get_cell`:** push updates to dependents on write (store computed values) so reads are O(1).
4. **Ranges / functions:** support `SUM(A1:A10)`, etc.
5. **Concurrency:** multiple writers; how do you keep the DAG consistent?
