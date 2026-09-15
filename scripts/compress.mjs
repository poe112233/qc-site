import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'public');
const tmpDir = path.resolve(process.cwd(), 'public', 'images_tmp');
fs.mkdirSync(tmpDir, { recursive: true });

async function compressProduct(productId) {
  const dir = path.join(OUT, 'images', productId);
  const tmpProductDir = path.join(tmpDir, productId);
  fs.mkdirSync(tmpProductDir, { recursive: true });

  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  let totalBefore = 0, totalAfter = 0;

  for (const file of files) {
    const src = path.join(dir, file);
    const dest = path.join(tmpProductDir, file);
    totalBefore += fs.statSync(src).size;
    try {
      await sharp(src)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 60, progressive: true })
        .toFile(dest);
      totalAfter += fs.statSync(dest).size;
    } catch (e) {
      console.log(`  skip ${file}: ${e.message}`);
    }
  }

  for (const file of files) {
    const tmpFile = path.join(tmpProductDir, file);
    if (fs.existsSync(tmpFile)) {
      fs.copyFileSync(tmpFile, path.join(dir, file));
    }
  }

  fs.rmSync(tmpProductDir, { recursive: true, force: true });
  console.log(`${productId}: ${files.length} images, ${Math.round(totalBefore/1048576)} MB -> ${Math.round(totalAfter/1048576)} MB (${Math.round(100 - (totalAfter/totalBefore)*100)}% smaller)`);
}

const products = fs.readdirSync(path.join(OUT, 'images'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const p of products) {
  await compressProduct(p);
}

const total = fs.readdirSync(path.join(OUT, 'images'))
  .filter(d => { try { return fs.statSync(path.join(OUT, 'images', d)).isDirectory(); } catch { return false; } })
  .reduce((sum, p) => {
    const dir = path.join(OUT, 'images', p);
    return sum + fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  }, 0);
console.log(`\nTotal: ${Math.round(total / 1048576)} MB`);
fs.rmSync(tmpDir, { recursive: true, force: true });
