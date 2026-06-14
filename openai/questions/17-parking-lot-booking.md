# 17. Parking Lot / Booking System

**Difficulty:** Medium
**Topics:** OOP Design, Data Modeling, Allocation
**Pattern:** Model entities cleanly → allocate/free → query availability → edge cases

---

## Problem

### Variant A — Parking Lot

Design a parking lot that handles vehicles of different sizes.

- Spot sizes: `SMALL`, `MEDIUM`, `LARGE`. Vehicle types map to the smallest spot they can use (a large vehicle needs a large spot; a small vehicle can use any spot — define your rule).
- `park(vehicle) -> ticket | None` — allocate a suitable spot, or `None` if full.
- `leave(ticket)` — free the spot.
- `availability()` — count of free spots (optionally by size).

### Variant B — Booking System (meeting rooms / reservations)

- `book(resource, start, end) -> bool` — reserve a resource for a time interval if it doesn't overlap an existing booking.
- `cancel(booking_id)`
- `available(resource, start, end) -> bool`

---

### Example 1 (Parking)

```
lot = ParkingLot(small=1, medium=1, large=1)
t1 = lot.park(Car())          # car -> small or medium spot
t2 = lot.park(Truck())        # truck -> large spot
lot.availability()            -> {small:?, medium:?, large:0}
lot.leave(t2)
lot.availability()["large"]   -> 1
```

### Example 2 (Booking, no overlap)

```
b.book("RoomA", 9, 10)   -> True
b.book("RoomA", 9, 11)   -> False   # overlaps
b.book("RoomA", 10, 11)  -> True    # adjacent, no overlap
b.book("RoomB", 9, 10)   -> True    # different resource
```

---

### Constraints

- Use clean models (`@dataclass` / classes) with a clear API.
- Define overlap precisely: `[start, end)` half-open (so `10–11` doesn't overlap `9–10`).
- Surface the hidden edge cases (full lot, double-free, zero-length booking).

---

## Follow-up chain

1. **Efficient availability:** find a free spot in O(1) using per-size free lists rather than scanning.
2. **Overlap queries at scale:** interval tree / sorted intervals + binary search instead of linear overlap checks.
3. **Pricing / time-based fees:** charge by duration.
4. **Concurrency:** two requests racing for the last spot — ensure no double-allocation.
5. **Multi-level / nearest-spot:** allocate the closest available spot to the entrance.
