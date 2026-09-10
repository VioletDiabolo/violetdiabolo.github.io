import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'images');

export const TARGETS = [
  { name: 'group-usadc', file: 'group-usadc.png', widths: [900, 1600, 2400], jpg: true },
  { name: 'usadc-wide',  file: 'usadc-wide.png',  widths: [900, 1600, 2400], jpg: true },
  { name: 'aaron',       file: 'aaron.jpg',       widths: [400, 800],        jpg: false },
  { name: 'jon',         file: 'jon.jpg',         widths: [400, 800],        jpg: false },
];

export async function buildAssets() {
  await mkdir(OUT, { recursive: true });
  const written = [];
  for (const t of TARGETS) {
    for (const w of t.widths) {
      const base = sharp(path.join(SRC, t.file)).resize(w, null, { withoutEnlargement: true });
      const jobs = [
        base.clone().avif({ quality: 55 }).toFile(path.join(OUT, `${t.name}-${w}.avif`)),
        base.clone().webp({ quality: 70 }).toFile(path.join(OUT, `${t.name}-${w}.webp`)),
      ];
      if (t.jpg) jobs.push(base.clone().jpeg({ quality: 50, mozjpeg: true }).toFile(path.join(OUT, `${t.name}-${w}.jpg`)));
      const results = await Promise.all(jobs);
      results.forEach((r, i) => written.push({ file: `${t.name}-${w}`, kb: Math.round(r.size / 1024), i }));
    }
  }
  return written;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const written = await buildAssets();
  const worst = Math.max(...written.map((w) => w.kb));
  console.log(`wrote ${written.length} files, largest ${worst} KB`);
  if (worst >= 400) {
    console.error(`FAIL: ${worst} KB exceeds the 400 KB budget`);
    process.exit(1);
  }
}
