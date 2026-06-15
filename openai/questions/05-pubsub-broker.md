# 5. Pub/Sub Message Broker

**Difficulty:** Medium
**Topics:** Hash Map, Observer Pattern, Design
**Pattern:** Build basic broker → wildcards → delivery guarantees

---

## ✅ Implement exactly

A class `Broker` with:
- `subscribe(topic, callback) -> handle` — returns an opaque handle for unsubscribe
- `unsubscribe(handle) -> None`
- `publish(topic, message) -> None` — call every subscriber of `topic` in subscription order

Pin: a subscriber raising must **not** stop delivery to others; `publish` to a topic with no subscribers is a silent no-op. Do **exact-topic matching first**, then add `*`/`#` wildcards as the extension.

---

## Problem

Design an in-memory publish/subscribe message broker.

- `subscribe(topic, callback)` — register `callback` to receive messages published to `topic`. Return a handle that can be used to unsubscribe.
- `unsubscribe(handle)` — stop delivering to that subscriber.
- `publish(topic, message)` — deliver `message` to every subscriber of `topic` (in subscription order).

---

### Example 1

```
broker = Broker()
received = []
h = broker.subscribe("orders", lambda m: received.append(m))
broker.publish("orders", "order-1")     # received = ["order-1"]
broker.publish("payments", "pay-1")     # no subscriber, dropped
broker.unsubscribe(h)
broker.publish("orders", "order-2")     # not delivered
# received == ["order-1"]
```

### Example 2 (wildcards)

```
broker.subscribe("sensor.*", cb)       # single-level wildcard
broker.publish("sensor.temp", 22)      # delivered
broker.publish("sensor.temp.room1", 9) # NOT delivered (single level)

broker.subscribe("sensor.#", cb2)      # multi-level wildcard
broker.publish("sensor.temp.room1", 9) # delivered to cb2
```

---

### Constraints

- A subscriber raising an exception must not prevent delivery to the others.
- Multiple subscribers per topic; a subscriber may subscribe to multiple topics.
- Topic segments are `.`-separated (for the wildcard variant).

---

## Follow-up chain

1. **Wildcard topics:** `*` (one segment) and `#` (zero-or-more trailing segments). Match efficiently with a topic trie rather than scanning all subscriptions.
2. **Replay last N:** a new subscriber to a topic immediately receives the last `N` retained messages.
3. **Async / threaded delivery:** deliver on a worker pool; ordering per subscriber; backpressure if a subscriber is slow.
4. **At-least-once delivery + acks:** retry undelivered messages.
5. **Unsubscribe during publish:** handle a subscriber unsubscribing itself inside its callback without corrupting iteration.
