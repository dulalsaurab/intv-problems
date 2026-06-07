const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const db = new Database(path.join(__dirname, 'quickcart.db'));

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT DEFAULT 'customer',
      credit REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL,
      stock INTEGER
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      author TEXT,
      body TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      qty INTEGER,
      total REAL,
      receipt TEXT
    );
  `);
}

function seed() {
  init();
  db.exec('DELETE FROM users; DELETE FROM products; DELETE FROM reviews; DELETE FROM orders;');

  const insUser = db.prepare('INSERT INTO users (email, password, name, role, credit) VALUES (?, ?, ?, ?, ?)');
  insUser.run('admin@quickcart.io', md5('S3cretAdmin!'), 'Site Admin', 'admin', 0);
  insUser.run('alice@example.com', md5('alicepw'), 'Alice', 'customer', 50);
  insUser.run('bob@example.com', md5('bobpw'), 'Bob', 'customer', 0);

  const insProd = db.prepare('INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)');
  insProd.run('Wireless Mouse', 'Ergonomic 2.4GHz mouse', 24.99, 120);
  insProd.run('Mechanical Keyboard', 'Hot-swappable, RGB', 89.0, 40);
  insProd.run('USB-C Hub', '7-in-1 aluminum hub', 39.5, 75);

  const insRev = db.prepare('INSERT INTO reviews (product_id, author, body) VALUES (?, ?, ?)');
  insRev.run(1, 'Alice', 'Works great, very comfortable.');
  insRev.run(2, 'Bob', 'Love the typing feel!');

  const insOrder = db.prepare('INSERT INTO orders (user_id, product_id, qty, total, receipt) VALUES (?, ?, ?, ?, ?)');
  insOrder.run(2, 1, 1, 24.99, 'receipt-1001.txt');
  insOrder.run(3, 2, 1, 89.0, 'receipt-1002.txt');

  console.log('Seeded database.');
}

if (process.argv.includes('--seed')) {
  seed();
}

module.exports = { db, md5, init };
