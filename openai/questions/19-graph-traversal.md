# 19. Graph Traversal

**Difficulty:** Medium → Hard
**Topics:** BFS, DFS, Topological Sort, Cycle Detection
**Pattern:** Fundamental — underpins scheduler (#10) and spreadsheet (#8)

---

## ✅ Implement exactly (drill target: Variant B — Course Schedule II)

- `find_order(num_courses, prerequisites) -> list[int]` — `prerequisites[i] = [a, b]` means `b` before `a`. Return a valid ordering of all courses, or `[]` if impossible (cycle).

Pin: Kahn's algorithm (BFS on in-degrees) — naturally detects cycles (if you can't output all `num_courses`, there's a cycle). (Variant A — word ladder BFS — is the alternate; B reinforces topo/cycle used in #8/#10.)

---

## Problem

### Variant A — Word Ladder

Given `begin_word`, `end_word`, and a `word_list`, return the length of the shortest transformation sequence where each step changes exactly one letter and every intermediate word is in `word_list`. Return 0 if impossible.

### Variant B — Course Schedule (topo sort + cycle detection)

Given `num_courses` and `prerequisites` (pairs `[a, b]` meaning `b` must be taken before `a`), return a valid ordering of all courses, or `[]` if impossible (a cycle exists).

---

### Example 1 (Word Ladder)

```
begin = "hit", end = "cog"
word_list = ["hot","dot","dog","lot","log","cog"]
Output: 5      # hit -> hot -> dot -> dog -> cog
```

### Example 2 (Course Schedule)

```
num_courses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]
Output: [0,1,2,3]   # one valid order

prerequisites = [[1,0],[0,1]]
Output: []          # cycle -> impossible
```

---

### Constraints

- Word Ladder: BFS for shortest path; build neighbors efficiently (wildcard patterns like `h*t` to avoid O(N²) comparisons).
- Course Schedule: Kahn's algorithm (BFS on in-degrees) or DFS with coloring for cycle detection.
- State why BFS (not DFS) gives the shortest path in an unweighted graph.

---

## Follow-up chain

1. **Return the actual path**, not just its length (parent pointers / backtracking).
2. **Bidirectional BFS** for Word Ladder to cut the search space.
3. **Detect *all* cycles / report the cycle** in the prerequisite graph.
4. **Weighted edges:** switch to Dijkstra; when do you need it over BFS?
5. **Connected components / reachability** queries on the same graph.
