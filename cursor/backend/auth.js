const jwt = require('jsonwebtoken');

const JWT_SECRET = 'quickcart-secret';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }
  try {
    const payload = jwt.decode(token);
    if (!payload) {
      return res.status(401).json({ error: 'invalid token' });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
