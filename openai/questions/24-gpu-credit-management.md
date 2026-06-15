# 24. GPU Credit Management ⭐

**Difficulty:** Medium → Hard
**Topics:** Heap / Queue by Expiry, Time, Design
**Pattern:** Time-based credits that expire — consume soonest-to-expire first (FIFO)

---

## ✅ Implement exactly

A class `CreditManager` with:
- `add_credits(amount, expiry) -> None` — grant `amount` credits expiring at `expiry`
- `consume(amount, now) -> bool` — consume from the **soonest-to-expire non-expired** batch first; **all-or-nothing** (consume nothing and return `False` if insufficient valid credits)
- `balance(now) -> int` — total non-expired credits at `now`

Pin: a batch is valid iff `expiry > now` (state strict vs. `>=`); expired batches are purged lazily; min-heap / sorted structure keyed by `expiry`.

---

## Problem

Design a system that manages time-limited compute credits (think GPU credits that expire).

- `add_credits(amount, expiry_timestamp)` — grant `amount` credits that **expire** at `expiry_timestamp`.
- `consume(amount, now) -> bool` — consume `amount` credits at time `now`. Consume from the **soonest-to-expire non-expired batch first** (use-it-or-lose-it). Return `True` if enough valid credits exist, else `False` (and consume nothing).
- `balance(now)` — total non-expired credits available at time `now`.

---

### Example 1

```
m = CreditManager()
m.add_credits(100, expiry=10)
m.add_credits(50,  expiry=20)
m.balance(now=5)          -> 150
m.consume(120, now=5)     -> True
# consumes 100 from the batch expiring at 10, then 20 from the batch expiring at 20
m.balance(now=5)          -> 30
```

### Example 2 (expiry)

```
m.add_credits(100, expiry=10)
m.balance(now=15)         -> 0      # batch expired
m.consume(1, now=15)      -> False
```

### Example 3 (partial / ordering)

```
m.add_credits(30, expiry=100)
m.add_credits(30, expiry=50)
m.consume(40, now=10)     -> True
# takes 30 from expiry=50 (soonest) + 10 from expiry=100
m.balance(now=10)         -> 20     # remaining in expiry=100 batch
```

---

### Constraints

- Expired batches must never be consumed and should be purged lazily (when touched) to bound memory.
- Soonest-to-expire-first ordering — a min-heap or sorted queue keyed by `expiry`.
- `consume` is all-or-nothing: don't partially consume if the total is insufficient.

---

## Follow-up chain

1. **Heap keyed by expiry:** pop expired batches lazily; consume from the front.
2. **All-or-nothing check:** verify sufficient valid balance before mutating (or stage and roll back).
3. **Refunds / cancellation:** return consumed credits to their original batch.
4. **Concurrency:** many workers consuming simultaneously — lock strategy so two consumers can't double-spend the same batch.
5. **Reporting:** how much expired unused over a period (waste metric).
