const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// List all users (admin dashboard)
router.get('/users', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role, credit FROM users').all();
  res.json(rows);
});

// Adjust a user's store credit
router.post('/users/:id/credit', requireAuth, (req, res) => {
  const { amount } = req.body;
  db.prepare('UPDATE users SET credit = credit + ? WHERE id = ?').run(amount, req.params.id);
  res.json({ ok: true });
});

// Delete a user
router.delete('/users/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
