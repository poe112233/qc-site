(async () => {
  const grid = document.getElementById('grid');
  const countEl = document.getElementById('count');
  const searchInput = document.getElementById('search');

  let products = [];
  try {
    const res = await fetch('/products.json');
    products = await res.json();
  } catch (e) {
    grid.innerHTML = '<div class="loading">Failed to load products.</div>';
    return;
  }

  let filtered = products;

  function render() {
    countEl.textContent = `${filtered.length} products`;
    if (!filtered.length) {
      grid.innerHTML = '<div class="loading">No results.</div>';
      return;
    }
    grid.innerHTML = filtered.map(p => `
      <a class="product-card" href="/products/${p.id}/">
        <div class="card-thumb">
          ${p.imageCount > 0
            ? `<img src="/images/${p.id}/001.jpeg" alt="" loading="lazy">`
            : '<div class="thumb-placeholder">No images yet</div>'
          }
        </div>
        <div class="card-body">
          <div class="card-id">${p.id}</div>
          <div class="card-name">${p.name}</div>
          <div class="card-meta">${p.imageCount} images</div>
        </div>
      </a>
    `).join('');
  }

  function doFilter() {
    const q = searchInput.value.trim().toLowerCase();
    filtered = q
      ? products.filter(p =>
          p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
        )
      : products;
    render();
  }

  searchInput.addEventListener('input', doFilter);
  render();
})();
