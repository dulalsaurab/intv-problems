# 27. IPv4 Address Iterator ⭐

**Difficulty:** Medium → Hard
**Topics:** Iterators/Generators, Bit Manipulation, Parsing, Design
**Pattern:** Build a small system → iterate (forward → reverse → CIDR) → handle edge cases
**Related:** #23 Resumable Iterator, #20 Streaming

---

## ✅ Implement exactly (staged)

A class `IPv4Iterator(start, reverse=False)` with:
- `next() -> str` — current address (dotted-decimal), then advance (+1, or −1 if `reverse`)
- `has_next() -> bool` — `False` once past `255.255.255.255` (forward) or `0.0.0.0` (reverse)

Plus a function:
- `iterate_cidr(cidr) -> iterator` — yield every address in the block `a.b.c.d/n`, then stop (`2^(32-n)` addresses)

Pin: address = **32-bit int**; carry/borrow falls out of ±1; **stop at boundaries, never wrap**; validate input (octet ≤ 255, 4 segments). O(1) memory — never materialize the space.

---

## Problem

Implement an iterator that traverses IPv4 addresses starting from a given address.

An IPv4 address is a 32-bit unsigned integer, conventionally written in dotted-decimal form `a.b.c.d` where each octet is `0–255` (e.g. `"192.168.0.1"`). The key insight: an address is just a number in `[0, 2³² − 1]`, so "next address" is "+1" and iteration is integer arithmetic with parse/format on the boundary.

### Stage 1 — Forward iteration
- `IPv4Iterator(start)` — begin at the address `start` (a dotted-decimal string).
- `next()` — return the current address (dotted-decimal) and advance to the next one.
- `has_next()` — whether another address exists (i.e. we haven't passed `255.255.255.255`).

### Stage 2 — Reverse iteration
- Support a `reverse=True` mode (or a `prev()` method) that walks **downward** toward `0.0.0.0`.

### Stage 3 — CIDR block iteration
- `iterate_cidr(cidr)` — given a block like `"192.168.1.0/24"`, iterate **only** the addresses inside that block (here `192.168.1.0 … 192.168.1.255`), then stop.

---

### Example 1 (forward)

```
it = IPv4Iterator("192.168.0.254")
it.next()   -> "192.168.0.254"
it.next()   -> "192.168.0.255"
it.next()   -> "192.168.1.0"     # octet rollover carries
it.next()   -> "192.168.1.1"
```

### Example 2 (reverse)

```
it = IPv4Iterator("192.168.1.0", reverse=True)
it.next()   -> "192.168.1.0"
it.next()   -> "192.168.0.255"   # borrow across octets
it.next()   -> "192.168.0.254"
```

### Example 3 (CIDR /30 — 4 addresses)

```
it = iterate_cidr("10.0.0.0/30")
list(it) -> ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3"]
# /30 -> 2^(32-30) = 4 addresses, then has_next() == False
```

### Example 4 (boundary)

```
it = IPv4Iterator("255.255.255.255")
it.next()      -> "255.255.255.255"
it.has_next()  -> False           # no address after the max; don't overflow/wrap
```

---

### Constraints

- Octets are `0–255`; the full space is `0.0.0.0 … 255.255.255.255` (2³² addresses).
- **Rollover must carry across octets** (`...0.255` → `...1.0`), and reverse must **borrow** (`...1.0` → `...0.255`).
- **Boundaries:** forward must stop at `255.255.255.255` (no 32-bit overflow / wrap to `0.0.0.0`); reverse must stop at `0.0.0.0`.
- Validate input: reject malformed addresses (octet > 255, wrong segment count, non-numeric).
- For CIDR, `/n` means the first `n` bits are the network prefix; the block has `2^(32−n)` addresses; the start address's host bits should be masked to the network address (decide and state whether you require an aligned block or normalize it).

---

## Key idea (state up front)

Convert dotted-decimal ↔ 32-bit int and do all arithmetic on the int:

```
ip_to_int("a.b.c.d") = (a<<24) | (b<<16) | (c<<8) | d
int_to_ip(n)         = ".".join(str((n >> s) & 0xFF) for s in (24,16,8,0))
next = n + 1   (forward) ;  n - 1 (reverse)
```

CIDR: `mask = (0xFFFFFFFF << (32 - n)) & 0xFFFFFFFF`; `network = base & mask`; iterate `network … network + 2^(32-n) - 1`.

This turns "carry across octets" into plain `+1` and makes boundary checks simple range comparisons.

---

## Follow-up chain (OpenAI will layer these)

1. **Lazy / generator form:** make it a true Python iterator (`__iter__`/`__next__`) so it composes with `for`, `list`, `itertools.islice`.
2. **Resumable / serialize position:** save the current address to a token and resume a fresh iterator from it (ties to #23). Just persist the int.
3. **Step / stride:** `step=k` to skip every k-th address; subnet-by-subnet iteration (`/24` blocks across a `/16`).
4. **Range iterator:** iterate an inclusive range `start..end` rather than from a single start to the edge of the space.
5. **IPv6:** generalize to 128-bit. Why the int-based design scales (Python big ints) and what changes in parsing/formatting.
6. **Memory:** prove you never materialize the whole space — even a `/8` is 16M addresses; iteration must be O(1) memory.
7. **Skip reserved ranges:** optionally skip network/broadcast addresses of each subnet, or private/reserved blocks.
