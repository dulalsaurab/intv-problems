# OpenAI Coding — 10-Day Plan

**Interview:** 10 days out. Triage to the **7 pattern-cores** (they cover all 27 problems).
Master the ⭐ high-prob targets cold; gain awareness of the rest.

## Method (every problem)
1. **Study** the reference solution + annotations until you can explain *why* each line (not what).
2. **Recall same day:** blank file, reimplement the base from memory. Struggle = learning. Note where you blanked.
3. **Next day:** reimplement again + add one extension from the follow-up chain.
4. **Daily warm-up (20 min):** cold re-derive 2 problems from prior days *before* new material (spaced repetition).
5. **Think out loud, write tests as you go, declare speed-vs-depth in first 60s.** That's how they grade.

## The 7 cores
- **A. dict + snapshot/diff** → #1, #7, #21
- **B. deque/heap keyed by time** → #2, #6, #12, #24, #28
- **C. hashmap + doubly-linked list (O(1))** → #3
- **D. tree/graph + BFS/DFS (topo, cycle, multi-source)** → #4, #8, #10, #19, #29
- **E. iterator/generator + saved position** → #20, #23, #27
- **F. lock + condition / thread-safe set** → #9, #11, #14, #25
- **G. encoding / OOP modeling** → #16, #17, #22

## Highest-probability targets (drill these most)
#21, #22, #1, #8, #24, #25  + #2, #4

## Day-by-day
| Day | Focus (core) | Problems | Notes |
|-----|--------------|----------|-------|
| 1 | A | **#1 KV-txn**, **#21 time-based KV** | both ⭐, shared "versioned dict" intuition |
| 2 | A + G | #7 versioned, **#22 serialize** | #22 pairs with #21 |
| 3 | E | #23 resumable, **#27 IPv4**, #20 merge-K | iterators day |
| 4 | B | **#2 rate limiter**, **#24 GPU credits** | both ⭐ time/heap |
| 5 | B | **#28 scheduler**, #6 metrics, #12 event loop | #28 ⭐; #12/#28/#6 share the heap-by-time core |
| 6 | C + D | #3 LRU/LFU, **#4 filesystem cd** | |
| 7 | D | **#8 spreadsheet**, #19 graph, **#29 disease spread**, #10 scheduler | DAG + multi-source BFS day |
| 8 | F | #9 bounded queue, #14 counter, **#25 crawler** | concurrency |
| 9 | review | cold timed reps; #11 async, #16/#17 skim | mixed review |
| 10 | review | cold reps on the 8 ⭐ targets only; rest | NO new material |

## Progress
- [ ] Day 1 — #1, #21
- [ ] Day 2 — #7, #22
- [ ] Day 3 — #23, #27, #20
- [ ] Day 4 — #2, #24
- [ ] Day 5 — #28, #6, #12
- [ ] Day 6 — #3, #4
- [ ] Day 7 — #8, #19, #29, #10
- [ ] Day 8 — #9, #14, #25
- [ ] Day 9 — review + #11, #16, #17
- [ ] Day 10 — final cold reps
