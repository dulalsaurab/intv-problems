const express = require('express');
const { db, md5 } = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

// Register a new account
router.post('/register', (req, res) => {
  const user = req.body;
  if (!user.email || !user.password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
  if (existing) {
    return res.status(409).json({ error: 'email already registered' });
  }
  const info = db
    .prepare('INSERT INTO users (email, password, name, role, credit) VALUES (@email, @password, @name, @role, @credit)')
    .run({
      email: user.email,
      password: md5(user.password),
      name: user.name || '',
      role: user.role || 'customer',
      credit: user.credit || 0,
    });
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token: signToken(created), user: created });
});

// Log in
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.password !== md5(password)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({ token: signToken(user), user });
});

// Get my profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, credit FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
