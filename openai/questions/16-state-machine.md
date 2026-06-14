# 16. Elevator / Vending Machine State Machine

**Difficulty:** Medium → Hard
**Topics:** Finite State Machine, Enums, Event Processing, Design
**Pattern:** Model states + transitions → process event stream → edge cases

---

## Problem

### Variant A — Vending Machine

Model a vending machine as a state machine.

- States: `IDLE`, `COLLECTING_MONEY`, `DISPENSING`.
- `insert_coin(amount)` — add money to the balance.
- `select(item)` — choose an item; if balance ≥ price and item in stock, dispense and return change; otherwise stay collecting / refund as appropriate.
- `cancel()` — refund the current balance, return to `IDLE`.

### Variant B — Elevator

Model an elevator serving floor requests.

- `request(floor)` — add a destination/call.
- `step()` — advance one tick: move one floor toward the next target, open/close doors on arrival.
- Track direction (`UP`/`DOWN`/`IDLE`) and serve requests in a sensible order (e.g. SCAN/elevator algorithm).

---

### Example 1 (Vending machine, item "A" costs 75)

```
vm.insert_coin(25)            # balance 25, state COLLECTING
vm.select("A")               -> "insufficient funds" (need 75)
vm.insert_coin(50)            # balance 75
vm.select("A")               -> dispense "A", change 0, state -> IDLE
vm.insert_coin(100)
vm.select("A")               -> dispense "A", change 25
```

### Example 2 (Elevator)

```
e = Elevator(floors=10)        # at floor 0, IDLE
e.request(5)
e.request(3)
e.step() ... # moves up: 0->1->2->3 (stop, open/close) ->4->5 (stop)
# serves 3 then 5 while traveling up (SCAN), not in request order
```

---

### Constraints

- Define states as an enum and transitions explicitly (transition table or methods).
- Invalid events (e.g. `select` while `IDLE` with no money) must be handled gracefully.
- Be explicit about edge cases: exact change, out of stock, simultaneous requests.

---

## Follow-up chain

1. **Out of stock / out of change:** reject the purchase and refund.
2. **Concurrency:** multiple buttons pressed "at once" — serialize events.
3. **Multiple elevators:** dispatch a request to the best car.
4. **Persistence/recovery:** restore machine state after a restart.
5. **Testing:** drive the FSM with a scripted event stream and assert the state trace.
