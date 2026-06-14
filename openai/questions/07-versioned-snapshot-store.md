# 7. Versioned / Snapshot Store

**Difficulty:** Medium → Hard
**Topics:** Copy-on-Write, Versioning, Design
**Pattern:** Build a versioned KV → snapshots → efficient memory

---

## Problem

Design a key-value store where **every write creates a new version**, and you can read the value of a key as of any past version.

- `set(key, value)` — write a value; returns the new global version number (monotonically increasing).
- `get(key)` — return the latest value for `key` (or `None`).
- `get(key, version)` — return the value of `key` **as of** that version (latest write to `key` with version `<= version`).
- `snapshot()` — capture the current state and return a snapshot id.
- `restore(snapshot_id)` — make the store's current state equal to that snapshot (future writes branch from there).

---

### Example 1

```
s = VersionStore()
v1 = s.set("a", 1)     # v1 = 1
v2 = s.set("a", 2)     # v2 = 2
v3 = s.set("b", 9)     # v3 = 3
s.get("a")             -> 2
s.get("a", v1)         -> 1
s.get("b", v2)         -> None    # b didn't exist at v2
s.get("b", v3)         -> 9
```

### Example 2 (snapshot / restore)

```
snap = s.snapshot()
s.set("a", 100)
s.get("a")             -> 100
s.restore(snap)
s.get("a")             -> 2       # back to snapshot state
```

---

### Constraints

- `get(key, version)` should be O(log n) in the number of versions for that key (sorted versions + binary search), not O(total writes).
- Don't deep-copy the whole store on every `set` or `snapshot`.

---

## Follow-up chain

1. **Copy-on-write snapshots:** make `snapshot()` O(1) by sharing structure; copy only on subsequent writes.
2. **Garbage collection:** reclaim versions no longer reachable from any live snapshot.
3. **Diff between versions:** return keys changed between version A and B.
4. **Persistence:** append-only log of versions; recover by replay.
5. **Concurrency:** snapshots provide a natural isolation point — discuss MVCC-style reads without blocking writes.
