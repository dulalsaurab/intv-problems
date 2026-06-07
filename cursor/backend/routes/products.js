const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// List / search products
router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`).all();
  } else {
    rows = db.prepare('SELECT * FROM products').all();
  }
  res.json(rows);
});

// Get one product
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'not found' });
  res.json(product);
});

// List reviews for a product
router.get('/:id/reviews', (req, res) => {
  const rows = db.prepare('SELECT * FROM reviews WHERE product_id = ?').all(req.params.id);
  res.json(rows);
});

// Post a review
router.post('/:id/reviews', requireAuth, (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  db.prepare('INSERT INTO reviews (product_id, author, body) VALUES (?, ?, ?)').run(
    req.params.id,
    req.user.email,
    body
  );
  res.json({ ok: true });
});

module.exports = router;
