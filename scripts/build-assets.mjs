import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'images');

/**
 * Widths cap at 2000, not 2400. Measured on a 4032x3024 master: at 2400 the brief's
 * intended quality yields WebP 406 KB and JPEG 531 KB, both over the 400 KB budget, while
 * 2000 yields AVIF 240 / WebP 307 / JPEG 387. Capping the width preserves image quality;
 * dropping quality to fit 2400 would not.
 *
 * `jpgWidths` is the last-resort JPEG, for browsers supporting neither AVIF nor WebP. None
 * of the targets below asks for one any more: the two that did -- the USADA group shot and
 * the stage strip -- went with the About and Contact panels they illustrated, and nothing
 * that renders neither format is going to reach this site.
 *
 * Every target has to be ASKED FOR by content, and tests/assets.test.js checks both
 * directions: a base name content uses that nothing builds is a <picture> of 404s, and a
 * target content never uses is dead weight in public/images -- which ships to dist/ whole.
 * The practice gallery's six went on that rule when the client took the photographs off
 * the Media page ("Remove images from media. Keep only the videos."); their masters are
 * in git history, and the originals are in the club's Drive folder.
 */
export const TARGETS = [
  { name: 'aaron',       file: 'aaron.jpg',       widths: [400, 800],        jpgWidths: [] },
  { name: 'jon',         file: 'jon.jpg',         widths: [400, 800],        jpgWidths: [] },

  // The club's mark, in the nav bar. 128 is the 4x size of a ~32px chip -- the master is
  // 521x608, and shipping 63KB of PNG for a 32px mark is what the pipeline is for.
  { name: 'logo', file: 'logo.png', widths: [64, 128], jpgWidths: [] },

  // Marquee marks. Every master is 480px wide so `withoutEnlargement` can never shrink a
  // derivative below the width its own filename claims; they render at 1.75rem tall, so
  // 240 covers a 3x screen for the squares and about 2.4x for the widest wordmark.
  ...['logo-bkcm', 'logo-cuwushu', 'logo-cyi', 'logo-kpl', 'logo-moonlite', 'logo-nyu-acu',
      'logo-nyu-ahm', 'logo-nyu-css', 'logo-nyu-hksa', 'logo-nyu-ksa', 'logo-nyu-vsa',
      'logo-nyu-welcome', 'logo-tap', 'logo-usada']
    .map((name) => ({ name, file: `${name}.png`, widths: [120, 240], jpgWidths: [] })),

  // The hero and the events panel. Both sit in a panel's second column -- at most about
  // 700px at 1440 -- so 1600 covers a 2x screen with room to spare.
  { name: 'hero-group',      file: 'hero-group.jpg',      widths: [800, 1600], jpgWidths: [] },
  // 1200, not 1600, because this one is a PORTRAIT: its master is 1500x2000, and
  // `withoutEnlargement` would have capped a 1600 request at 1500 while the srcset still
  // advertised it as 1600w. A `w` descriptor that lies makes the browser pick the wrong
  // file; the guard in tests/assets.test.js now checks every derivative against its own
  // filename for exactly this.
  { name: 'events-practice', file: 'events-practice.jpg', widths: [600, 1200], jpgWidths: [] },

  // Board portraits, at the same two widths as the two that predate them: the card crops
  // to 4:5 at a track of at most 320px, so 800 is already the 2x size.
  { name: 'board-barry',  file: 'board-barry.jpg',  widths: [400, 800], jpgWidths: [] },
  { name: 'board-evan',   file: 'board-evan.jpg',   widths: [400, 800], jpgWidths: [] },
  { name: 'board-hannah', file: 'board-hannah.jpg', widths: [400, 800], jpgWidths: [] },
];

/**
 * The read-and-resize half of the pipeline, exported so it can be tested against a master
 * whose orientation is known rather than only against whatever happens to be in
 * assets-src today.
 *
 * `.rotate()` with no angle applies the file's EXIF orientation. It is written before
 * `.resize()` because that reads in the order it happens, but sharp applies a
 * no-argument rotate during input decode, so the position in the chain does not actually
 * matter — measured, after a test that claimed it did was passed by a mutation moving the
 * call after the resize. Do not rely on the ordering; rely on the call being there.
 *
 * It is here because it was missing, and it mattered: nine of the fifteen photographs
 * pulled from the client's Drive folder were portraits stored as 4608x3456 landscape with
 * orientation=8. Without this call they built rotated 90 degrees. The masters in the
 * repository are all upright with no orientation flag — every Drive photograph was
 * rewritten that way on the way in, because a master that carries a flag every consumer
 * has to remember is a trap waiting for the next tool — so nothing here depends on it today.
 * It is for the next photograph someone drops in straight off a camera.
 */
export function prepare(input, width) {
  return sharp(input).rotate().resize(width, null, { withoutEnlargement: true });
}

export async function buildAssets() {
  await mkdir(OUT, { recursive: true });
  const written = [];
  for (const t of TARGETS) {
    for (const w of t.widths) {
      const base = prepare(path.join(SRC, t.file), w);
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
