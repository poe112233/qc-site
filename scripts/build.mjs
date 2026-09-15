import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, '..', 'yeezy_extracted', 'yeezy');
const OUT = path.resolve(ROOT, 'public');

// Read all product folders
const folders = fs.readdirSync(SRC, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const products = folders.map(name => {
  const [id, ...rest] = name.split('_');
  const desc = rest.join('_')
    .replace(/^[0-9¥￥$≈~\s]+/, '')
    .replace(/&quot;|&quo|&qu/g, '')
    .replace(/&amp;/g, '&')
    .trim();
  const imgDir = path.join(SRC, name);
  const images = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).sort();
  return { id, name, desc, imageCount: images.length };
});

// Build products.json
const productsJson = products.map(p => ({
  id: p.id,
  name: p.desc,
  imageCount: p.imageCount,
}));

fs.writeFileSync(
  path.join(OUT, 'products.json'),
  JSON.stringify(productsJson, null, 2),
  'utf8'
);

// Copy images
for (const p of products) {
  const srcDir = path.join(SRC, p.name);
  const destDir = path.join(OUT, 'images', p.id);
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  for (const f of files) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  }
  console.log(`Copied ${files.length} images for ${p.id}`);
}

// Generate product HTML pages
const productTemplate = (p) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.id} - ${p.desc.replace(/&/g, '&amp;').replace(/</g, '&lt;')} | QC</title>
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="logo">QC Gallery</a>
    <nav><a href="/#products">All Products</a></nav>
  </div>
</header>
<main class="product-page">
  <div class="product-header">
    <div>
      <span class="product-id">${p.id}</span>
      <h1 class="product-name">${p.desc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
      <p class="product-meta">${p.imageCount} images</p>
    </div>
  </div>
  <div class="gallery" id="gallery">
    ${p.imageCount > 0 ? '' : '<p class="no-images">No images yet.</p>'}
  </div>
</main>
<footer class="site-footer">
  <p>QC &copy; 2026 &mdash; <a href="/">All Products</a></p>
</footer>
<script src="/js/gallery.js" data-product="${p.id}" data-count="${p.imageCount}"></script>
</body>
</html>`;

for (const p of products) {
  const html = productTemplate(p);
  const destFile = path.join(OUT, 'products', p.id, 'index.html');
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, html, 'utf8');
}

// Generate 404 / redirect
fs.writeFileSync(
  path.join(OUT, '404.html'),
  `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>404</title><link rel="stylesheet" href="/css/style.css"></head><body class="404"><h1>404</h1><p>Product not found.</p><a href="/">Back to All Products</a></body></html>`,
  'utf8'
);

console.log(`Built ${products.length} product pages.`);
