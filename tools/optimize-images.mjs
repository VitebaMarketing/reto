// Optimiza las imágenes de design/originales → web/assets/img (WebP, tamaño de tablet).
//   cd tools && npm install && npm run images
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const src = (f) => fileURLToPath(new URL(`../design/originales/${f}`, import.meta.url));
const out = (f) => fileURLToPath(new URL(`../web/assets/img/${f}`, import.meta.url));

const jobs = [
  ['escena.webp', 1672, 78],
  ['podio.webp', 1100, 82],
  ['vf-iconos.webp', 900, 82],
  ['forma.webp', 900, 82],
  ['vitamina-c.webp', 900, 82],
  ['movimiento.webp', 900, 82],
];
for (const [file, width, quality] of jobs) {
  const info = await sharp(src(file)).resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 6 }).toFile(out(file));
  console.log(file, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}

// Fotos oficiales de producto: se recorta el fondo blanco (relleno desde los bordes) sin tocar el producto.
// Para usar otras imágenes de premio (p. ej. los sticks sueltos con fondo transparente), añádelas a
// design/originales como PNG/WebP con transparencia, inclúyelas en `jobs` y cambia `prizes` en web/js/config.js.
for (const name of ['sticks-essential', 'sticks-beauty', 'sticks-puro']) {
  const { data, info } = await sharp(src(`${name}.jpg`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const whiteness = (i) => Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, x + (h - 1) * w);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || whiteness(i) < 236) continue;
    seen[i] = 1;
    // Transparencia progresiva en el borde para evitar halo blanco.
    data[i * 4 + 3] = Math.max(0, Math.min(255, (252 - whiteness(i)) * 16));
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  const res = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim()
    .resize({ width: 640 }).webp({ quality: 86, alphaQuality: 95, effort: 6 }).toFile(out(`${name}.webp`));
  console.log(`${name}.webp`, `${res.width}x${res.height}`, `${Math.round(res.size / 1024)} KB`);
}

// Sticks sueltos del carrusel de premio (ya vienen con fondo transparente): se recorta el margen vacío.
// Guardar en design/originales como stick-essential, stick-beauty y stick-puro (.png o .webp).
for (const name of ['stick-essential', 'stick-beauty', 'stick-puro']) {
  const file = ['png', 'webp'].map((ext) => src(`${name}.${ext}`)).find(existsSync);
  if (!file) {
    console.log(`${name}: falta el original (el carrusel usa la foto de la caja mientras tanto)`);
    continue;
  }
  const res = await sharp(file).trim().resize({ height: 1100, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(out(`${name}.webp`));
  console.log(`${name}.webp`, `${res.width}x${res.height}`, `${Math.round(res.size / 1024)} KB`);
}
