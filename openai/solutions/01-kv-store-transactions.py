"""
#1 In-Memory KV Store with Nested Transactions  — Day 1 reference

THE BIG IDEA
------------
A transaction = a "diff layer" stacked on top of the committed store.
- begin()    -> push a new empty diff dict onto a stack
- set/delete -> write into the TOP diff layer only (never touch base until commit)
- get(key)   -> search layers top-down, fall back to base
- commit()   -> merge top layer DOWN into the layer beneath it (or base)
- rollback() -> throw the top layer away

Why a stack of diffs (not snapshots of the whole store)?
  Snapshotting copies every key on every begin() -> O(N) memory/time per begin.
  A diff layer only stores the keys *touched* in that transaction -> O(changes).
  Nested transactions fall out for free: it's just a deeper stack.

THE SENTINEL TRAP (this is the thing interviewers probe)
  Inside a transaction you must distinguish three states for a key:
    1. "I set it to a new value in this txn"      -> store the value
    2. "I DELETED it in this txn"                 -> store a TOMBSTONE
    3. "I didn't touch it in this txn"            -> not in this layer, look deeper
  You cannot use None for the delete marker, because None is a legal *value*
  a user might set. So we use a unique sentinel object _DELETED.
  Same reason get() returns a sentinel-aware 'absent' result internally.
"""

_DELETED = object()   # tombstone: "this key was deleted in this layer"
_MISSING = object()   # "not found in any layer" (distinct from a real None value)


class KVStore:
    def __init__(self):
        self.base = {}        # committed data
        self.stack = []       # list of diff layers; [-1] is the innermost/open txn

    # ---- transactions -------------------------------------------------------

    def begin(self):
        # New empty diff layer. O(1) — no copying of existing data.
        self.stack.append({})

    def commit(self):
        # Merge the innermost layer into the one beneath it (or base if none left).
        if not self.stack:
            return False                      # no-op, don't crash (spec requirement)
        layer = self.stack.pop()
        target = self.stack[-1] if self.stack else self.base
        for key, val in layer.items():
            if val is _DELETED:
                # A delete in the child must propagate as a delete in the parent.
                if not self.stack:
                    # committing to base: actually remove the key
                    self.base.pop(key, None)
                else:
                    # committing to a parent layer: keep the tombstone so the
                    # parent still "sees" the deletion relative to base.
                    target[key] = _DELETED
            else:
                target[key] = val
        return True

    def rollback(self):
        if not self.stack:
            return False                      # no-op
        self.stack.pop()                      # discard the layer entirely
        return True

    # ---- core ops -----------------------------------------------------------

    def set(self, key, value):
        # Writes always go to the top layer if a txn is open, else straight to base.
        self._top()[key] = value

    def delete(self, key):
        if self.stack:
            # Don't del from base — we might roll back. Record a tombstone instead.
            self.stack[-1][key] = _DELETED
        else:
            self.base.pop(key, None)          # idempotent: no error if absent

    def get(self, key):
        # Search layers top-down so uncommitted writes shadow committed ones.
        for layer in reversed(self.stack):
            if key in layer:
                val = layer[key]
                return None if val is _DELETED else val   # tombstone => absent
        return self.base.get(key)             # falls through to committed data

    # ---- helpers ------------------------------------------------------------

    def _top(self):
        return self.stack[-1] if self.stack else self.base


# ---- inline tests (write these AS YOU GO in the interview) ------------------
if __name__ == "__main__":
    # Example 1: basic rollback / commit
    kv = KVStore()
    kv.set("a", 1)
    assert kv.get("a") == 1
    kv.begin()
    kv.set("a", 2)
    assert kv.get("a") == 2          # sees uncommitted write
    kv.rollback()
    assert kv.get("a") == 1          # rolled back
    kv.begin()
    kv.set("a", 3)
    kv.commit()
    assert kv.get("a") == 3          # committed

    # Example 2: nested
    kv = KVStore()
    kv.set("x", 10)
    kv.begin()
    kv.set("x", 20)
    kv.begin()
    kv.set("x", 30)
    assert kv.get("x") == 30
    kv.rollback()                    # discard inner
    assert kv.get("x") == 20
    kv.commit()                      # apply outer
    assert kv.get("x") == 20

    # Example 3: delete + rollback
    kv = KVStore()
    kv.set("k", "v")
    kv.begin()
    kv.delete("k")
    assert kv.get("k") is None       # tombstone hides it
    kv.rollback()
    assert kv.get("k") == "v"        # delete undone

    # Edge: commit/rollback with no open txn = no-op
    kv = KVStore()
    assert kv.commit() is False
    assert kv.rollback() is False

    # Edge: None is a legal value, distinct from "absent"
    kv = KVStore()
    kv.set("n", None)
    assert kv.get("n") is None       # but the key EXISTS
    kv.begin()
    kv.delete("n")
    kv.commit()
    assert kv.get("n") is None       # now genuinely absent (same return, different meaning)

    print("all passed")
