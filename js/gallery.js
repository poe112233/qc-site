(async () => {
  const script = document.currentScript;
  const productId = script.dataset.product;
  const count = parseInt(script.dataset.count, 10);

  const gallery = document.getElementById('gallery');
  if (!count) {
    gallery.innerHTML = '<p class="no-images">No images yet.</p>';
    return;
  }

  // Load product data for image names
  let imgNames = [];
  try {
    const res = await fetch('/products.json');
    const products = await res.json();
    const p = products.find(x => x.id === productId);
    if (p) {
      // Reconstruct image filenames from sequential numbers
      // We know images are 001.jpeg, 002.jpeg etc. — load first few to verify
      // For safety, try to list via a manifest file
      const manifestRes = await fetch(`/images/${productId}/manifest.json`);
      if (manifestRes.ok) {
        imgNames = await manifestRes.json();
      }
    }
  } catch (e) { /* fall back */ }

  if (!imgNames.length) {
    // Fallback: generate sequential names
    imgNames = Array.from({ length: count }, (_, i) =>
      String(i + 1).padStart(3, '0') + '.jpeg'
    );
  }

  const items = imgNames.map((name, i) => `
    <div class="gallery-item" data-index="${i}">
      <img src="/images/${productId}/${name}" alt="Image ${i + 1}" loading="lazy">
      <span class="img-index">${i + 1}</span>
    </div>
  `).join('');
  gallery.innerHTML = items;

  // Lightbox
  let currentIdx = 0;
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close">&times;</button>
    <img alt="">
    <div class="lightbox-controls">
      <button class="lightbox-btn prev">&#8592;</button>
      <button class="lightbox-btn next">&#8594;</button>
    </div>
    <span class="lightbox-counter"></span>
  `;
  document.body.appendChild(lightbox);

  const lbImg = lightbox.querySelector('img');
  const lbCounter = lightbox.querySelector('.lightbox-counter');
  const lbClose = lightbox.querySelector('.lightbox-close');
  const lbPrev = lightbox.querySelector('.prev');
  const lbNext = lightbox.querySelector('.next');

  function showImage(i) {
    currentIdx = i;
    lbImg.src = `/images/${productId}/${imgNames[i]}`;
    lbCounter.textContent = `${i + 1} / ${imgNames.length}`;
  }

  function openLightbox(i) {
    lightbox.classList.add('active');
    showImage(i);
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  lightbox.querySelectorAll('.gallery-item')?.forEach(() => {});
  gallery.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index)));
  });
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => showImage((currentIdx - 1 + imgNames.length) % imgNames.length));
  lbNext.addEventListener('click', () => showImage((currentIdx + 1) % imgNames.length));
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage((currentIdx - 1 + imgNames.length) % imgNames.length);
    if (e.key === 'ArrowRight') showImage((currentIdx + 1) % imgNames.length);
  });
})();
