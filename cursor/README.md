# QuickCart

A small online store: browse products, read/post reviews, check out using store credit,
and an admin dashboard for managing users.

## Stack
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`)
- **Auth:** JWT (Bearer token)
- **Frontend:** static HTML/JS in `public/`

## Run it (optional — you can also review statically)
```bash
cd /Users/sdulal/Documents/interview-prep/cursor
npm install
npm run seed     # creates and seeds quickcart.db
npm start        # http://localhost:3000
```

Seeded accounts:
- `admin@quickcart.io` / `S3cretAdmin!`  (admin)
- `alice@example.com` / `alicepw`        (customer, $50 credit)
- `bob@example.com` / `bobpw`            (customer)

## Layout
```
backend/
  server.js          app wiring + error handler
  db.js              schema + seed
  auth.js            JWT sign/verify, auth middleware
  routes/
    users.js         register, login, profile
    products.js      list/search, reviews
    orders.js        checkout, order lookup, receipt download
    admin.js         user management
public/
  index.html, app.js frontend
receipts/            generated receipt files
```

See `TASK.md` for the exercise.
