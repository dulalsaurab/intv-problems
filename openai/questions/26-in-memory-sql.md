# 26. In-Memory SQL / Mini-ORM (built step-by-step) ⭐

**Difficulty:** Hard
**Topics:** Row Store, Predicate Filtering, Joins, Design
**Pattern:** The maximal version of #1 — build a query engine incrementally

---

## Problem

Build a small in-memory relational database, growing it one capability at a time as the interviewer adds requirements.

### Stage 1 — Tables & rows
- `create_table(name, columns)`
- `insert(table, row)` — `row` is a dict of `column -> value`.

### Stage 2 — Select with filtering
- `select(table, columns="*", where=None)` — return matching rows. `where` is a predicate (e.g. a callable or a simple `(col, op, value)` condition).

### Stage 3 — Joins
- `join(left, right, on)` — inner join two tables on a key (e.g. `left.id == right.user_id`). Then extend to support selecting columns from the joined result.

---

### Example 1 (insert + select + where)

```
db.create_table("users", ["id", "name", "age"])
db.insert("users", {"id": 1, "name": "Ada",  "age": 36})
db.insert("users", {"id": 2, "name": "Alan", "age": 41})

db.select("users", where=("age", ">", 40))
-> [{"id": 2, "name": "Alan", "age": 41}]

db.select("users", columns=["name"])
-> [{"name": "Ada"}, {"name": "Alan"}]
```

### Example 2 (join)

```
db.create_table("orders", ["order_id", "user_id", "total"])
db.insert("orders", {"order_id": 10, "user_id": 1, "total": 99})

db.join("users", "orders", on=("id", "user_id"))
-> [{"id":1,"name":"Ada","age":36,"order_id":10,"user_id":1,"total":99}]
```

---

### Constraints

- Clean separation: storage (row store) vs. query execution (filter/project/join).
- `where` should compose multiple conditions (AND/OR) — design for extension.
- Be explicit about how you represent rows, schemas, and missing columns.

---

## Follow-up chain

1. **Indexes:** add a hash index on a column so equality `where` and joins are O(1)/O(n) instead of O(n·m).
2. **Join algorithms:** nested-loop vs. **hash join**; when each wins.
3. **Aggregates:** `GROUP BY` + `COUNT/SUM/AVG`, `ORDER BY`, `LIMIT`.
4. **Query parsing:** accept an actual SQL-ish string and parse it into the operations above.
5. **Transactions:** wrap inserts/updates in commit/rollback (ties back to #1).
6. **Concurrency:** readers vs. writers; isolation level.
