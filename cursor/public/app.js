let token = localStorage.getItem('token');

async function search() {
  const q = document.getElementById('search').value;
  const res = await fetch('/api/products?q=' + q);
  const products = await res.json();
  const container = document.getElementById('products');
  container.innerHTML = products
    .map(
      (p) => `
      <div class="product">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <strong>$${p.price}</strong>
        <button onclick="loadReviews(${p.id})">See reviews</button>
      </div>`
    )
    .join('');
}

async function loadReviews(productId) {
  const res = await fetch('/api/products/' + productId + '/reviews');
  const reviews = await res.json();
  const container = document.getElementById('reviews');
  container.innerHTML = reviews
    .map((r) => `<div class="review"><b>${r.author}</b>: ${r.body}</div>`)
    .join('');
}

async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  token = data.token;
  localStorage.setItem('token', token);
  return data;
}

// Load products on page open
search();
