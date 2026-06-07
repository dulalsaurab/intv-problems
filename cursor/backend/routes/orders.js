const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const RECEIPTS_DIR = path.join(__dirname, '..', '..', 'receipts');

// Place an order
router.post('/checkout', requireAuth, (req, res) => {
  const { productId, qty, price } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'product not found' });

  const unitPrice = price != null ? price : product.price;
  const total = unitPrice * qty;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const remaining = user.credit - total;
  db.prepare('UPDATE users SET credit = ? WHERE id = ?').run(remaining, user.id);

  const receipt = `receipt-${Date.now()}.txt`;
  fs.writeFileSync(
    path.join(RECEIPTS_DIR, receipt),
    `Order for ${user.email}\nProduct: ${product.name}\nQty: ${qty}\nTotal: $${total}\n`
  );

  const info = db
    .prepare('INSERT INTO orders (user_id, product_id, qty, total, receipt) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, productId, qty, total, receipt);

  res.json({ orderId: info.lastInsertRowid, total, creditRemaining: remaining });
});

// Get an order
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(order);
});

// Download a receipt file
router.get('/receipt/download', requireAuth, (req, res) => {
  const file = req.query.file;
  const contents = fs.readFileSync(path.join(RECEIPTS_DIR, file), 'utf8');
  res.type('text/plain').send(contents);
});

module.exports = router;
