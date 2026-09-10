import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'images');

/**
 * Widths cap at 2000, not 2400. Measured on the 4032x3024 master: at 2400 the brief's
 * intended quality yields WebP 406 KB and JPEG 531 KB, both over the 400 KB budget, while
 * 2000 yields AVIF 240 / WebP 307 / JPEG 387. Capping the width preserves image quality;
 * dropping quality to fit 2400 would not.
 *
 * `jpgWidths` stops the last-resort JPEG at 1600 — it exists only for browsers supporting
 * neither AVIF nor WebP, which no longer meaningfully exist, and it is the least efficient
 * format at exactly the size where the budget is tightest.
 */
export const TARGETS = [
  { name: 'group-usadc', file: 'group-usadc.png', widths: [900, 1600, 2000], jpgWidths: [900, 1600] },
  { name: 'usadc-wide',  file: 'usadc-wide.png',  widths: [900, 1600, 2000], jpgWidths: [900, 1600] },
  { name: 'aaron',       file: 'aaron.jpg',       widths: [400, 800],        jpgWidths: [] },
  { name: 'jon',         file: 'jon.jpg',         widths: [400, 800],        jpgWidths: [] },
];

export async function buildAssets() {
  await mkdir(OUT, { recursive: true });
  const written = [];
  for (const t of TARGETS) {
    for (const w of t.widths) {
      const base = sharp(path.join(SRC, t.file)).resize(w, null, { withoutEnlargement: true });
      const jobs = [
        base.clone().avif({ quality: 55 }).toFile(path.join(OUT, `${t.name}-${w}.avif`)),
        base.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${t.name}-${w}.webp`)),
      ];
      const extensions = ['avif', 'webp'];
      if (t.jpgWidths.includes(w)) {
        jobs.push(base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${t.name}-${w}.jpg`)));
        extensions.push('jpg');
      }
      const results = await Promise.all(jobs);
      results.forEach((r, i) => {
        const ext = extensions[i];
        written.push({ file: `${t.name}-${w}.${ext}`, bytes: r.size });
      });
    }
  }
  return written;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const written = await buildAssets();
  const BUDGET = 400 * 1024;
  const worstBytes = Math.max(...written.map((w) => w.bytes));
  const worstFile = written.find((w) => w.bytes === worstBytes);
  console.log(`wrote ${written.length} files, largest ${worstFile.file} is ${Math.round(worstFile.bytes / 1024)} KB`);
  if (worstBytes >= BUDGET) {
    console.error(`FAIL: ${worstFile.file} = ${Math.round(worstBytes / 1024)} KB exceeds the 400 KB budget`);
    process.exit(1);
  }
}
