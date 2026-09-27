import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { TARGETS, prepare } from '../scripts/build-assets.mjs';

/** Every image base name content renders, with where it came from. */
async function referencedByContent() {
  const content = await import('../src/content/index.js');
  const referenced = new Map();
  const note = (base, where) => { if (base) referenced.set(base, where); };
  for (const photo of Object.values(content.PHOTOS)) note(photo.base, 'PHOTOS');
  for (const org of content.PERFORMED_FOR) note(org.logo, `PERFORMED_FOR (${org.name})`);
  for (const member of Object.values(content.BOARD).flat()) note(member.image, `BOARD (${member.name})`);
  note(content.LOGO.base, 'LOGO');
  return referenced;
}

describe('image pipeline', () => {
  it('applies a master\'s EXIF orientation', async () => {
    // Nine of the fifteen photographs pulled from the client's Drive folder were
    // PORTRAITS stored as 4608x3456 landscape with orientation=8. sharp ignores that
    // unless .rotate() is called, and the pipeline did not call it — they built lying on
    // their side.
    //
    // Tested against a synthesised master rather than a shipped one on purpose. The
    // masters in assets-src are all upright with no orientation flag (the practice six
    // were rewritten that way on the way in), so an assertion about THEIR derivatives
    // would pass whether or not .rotate() is still there — exactly the shape of test this
    // project has shipped before and paid for. This one cannot: remove the call and it
    // fails, because the input is 40x20 with orientation=8 and a correct pipeline emits
    // a 20-wide, 40-tall picture from it.
    const { default: sharp } = await import('sharp');
    const master = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#4c1e9e' } })
      .jpeg().withMetadata({ orientation: 8 }).toBuffer();

    const { info } = await prepare(master, 20).webp().toBuffer({ resolveWithObject: true });

    expect([info.width, info.height], 'the EXIF orientation was not applied')
      .toEqual([20, 40]);

    // NOT asserted here, because it was tried and turned out not to be true: this test
    // first claimed the rotate had to come BEFORE the resize, and a mutation that moved
    // `.rotate()` after `.resize()` passed it. sharp applies a no-argument rotate during
    // input decode, so call order relative to resize makes no difference. The claim went
    // rather than the mutation being explained away — a test whose name asserts more than
    // its body can see is the failure mode this suite exists to avoid.
  });

  it('builds every image the CONTENT asks for, by name', async () => {
    // The gap this closes: a base name in src/content/index.js that the pipeline has no
    // target for renders a <picture> whose every source 404s. Nothing else here would
    // have said so — a mutation pointing a marquee logo at 'logo-does-not-exist' passed
    // the whole suite, because every other guard checks the pipeline against ITSELF and
    // the DOM against content, and nobody checked content against the pipeline.
    const built = new Set(TARGETS.map((t) => t.name));
    const referenced = await referencedByContent();

    expect(referenced.size, 'no content image names resolved — this guard is reading nothing')
      .toBeGreaterThan(15);
    const missing = [...referenced].filter(([base]) => !built.has(base))
      .map(([base, where]) => `${base} — referenced by ${where}`);
    expect(missing, 'content references images the pipeline never builds').toEqual([]);
  });

  it('builds nothing content does not ask for', async () => {
    // The other direction. public/images ships to dist/ whole, so a target nothing
    // renders is bytes every deploy carries for no page. Eight of them outlived their
    // panels at once: the USADA group shot and the stage strip went with About and
    // Contact, and the six gallery photographs with the Media page's pictures.
    const referenced = await referencedByContent();
    const unused = TARGETS.map((t) => t.name).filter((name) => !referenced.has(name));
    expect(unused, 'the pipeline builds images no page renders').toEqual([]);
  });

  it('keeps no master the pipeline does not read', () => {
    // assets-src is committed, and a master is megabytes of repository for every clone.
    const read = new Set(TARGETS.map((t) => t.file));
    const orphans = readdirSync('assets-src').filter((f) => !f.startsWith('.') && !read.has(f));
    expect(orphans, 'masters that no target builds from').toEqual([]);
  });

  it('configures no width above 2000, the ceiling that fits the budget at full quality', () => {
    for (const t of TARGETS) expect(Math.max(...t.widths)).toBeLessThanOrEqual(2000);
  });

  it('configures no last-resort JPEG at the largest width', () => {
    for (const t of TARGETS) {
      if (t.jpgWidths.length === 0) continue;
      expect(Math.max(...t.jpgWidths)).toBeLessThan(Math.max(...t.widths));
    }
  });

  it('configures an 800px derivative for each board portrait', () => {
    for (const name of ['aaron', 'jon']) {
      const t = TARGETS.find((x) => x.name === name);
      expect(t.widths).toContain(800);
    }
  });

  // The three tests above assert configuration. This one asserts reality: it reads the
  // bytes actually on disk, and fails loudly rather than skipping when they are missing.
  describe('generated derivatives', () => {
    const OUT = 'public/images';

    it('has been generated — run `npm run assets` if this fails', () => {
      expect(existsSync(OUT), `${OUT} is missing; generated derivatives are required`).toBe(true);
      expect(readdirSync(OUT).length).toBeGreaterThan(0);
    });

    it('ships no image at or over 400 KB', () => {
      const BUDGET = 400 * 1024;
      const oversize = readdirSync(OUT)
        .map((f) => ({ f, bytes: statSync(`${OUT}/${f}`).size }))
        .filter((x) => x.bytes >= BUDGET)
        .map((x) => `${x.f} = ${(x.bytes / 1024).toFixed(1)} KB`);
      expect(oversize, `over the ${BUDGET} byte budget:\n${oversize.join('\n')}`).toEqual([]);
    });

    it('emits each derivative at the width its filename claims', async () => {
      // The srcset `w` descriptor is built from the filename (src/ui/picture.js), so a
      // file narrower than its own name is a lie the browser acts on: it picks a
      // candidate believing it is wide enough and gets something smaller.
      //
      // The way this happens is `withoutEnlargement: true` in the pipeline meeting a
      // master that is smaller than a configured width. It nearly shipped: the events
      // photograph was configured at [800, 1600] while landscape, then replaced with a
      // PORTRAIT whose master is 1500x2000 — the 1600 derivative would have been written
      // at 1500 and advertised as 1600w.
      const { default: sharp } = await import('sharp');
      const wrong = [];
      for (const t of TARGETS) {
        for (const w of [...t.widths, ...t.jpgWidths]) {
          for (const ext of t.jpgWidths.includes(w) ? ['avif', 'webp', 'jpg'] : ['avif', 'webp']) {
            const file = `${t.name}-${w}.${ext}`;
            if (!existsSync(`${OUT}/${file}`)) continue; // 'emits every configured derivative' owns that
            const meta = await sharp(`${OUT}/${file}`).metadata();
            if (meta.width !== w) wrong.push(`${file} is ${meta.width}px wide, not ${w}`);
          }
        }
      }
      expect([...new Set(wrong)], 'these ship a width their srcset descriptor contradicts')
        .toEqual([]);
    });

    it('ships no derivative the pipeline does not build', () => {
      // A retired target's files do not delete themselves: `npm run assets` writes, it
      // never cleans. Every file here has to be one some target, at one of its widths,
      // would write today.
      const expected = new Set(TARGETS.flatMap((t) => [
        ...t.widths.flatMap((w) => [`${t.name}-${w}.avif`, `${t.name}-${w}.webp`]),
        ...t.jpgWidths.map((w) => `${t.name}-${w}.jpg`),
      ]));
      const stray = readdirSync(OUT).filter((f) => !f.startsWith('.') && !expected.has(f));
      expect(stray, 'public/images holds files no target builds').toEqual([]);
    });

    it('emits every configured derivative', () => {
      const present = new Set(readdirSync(OUT));
      for (const t of TARGETS) {
        for (const w of t.widths) {
          expect(present, `missing ${t.name}-${w}.avif`).toContain(`${t.name}-${w}.avif`);
          expect(present, `missing ${t.name}-${w}.webp`).toContain(`${t.name}-${w}.webp`);
        }
        for (const w of t.jpgWidths) {
          expect(present, `missing ${t.name}-${w}.jpg`).toContain(`${t.name}-${w}.jpg`);
        }
      }
    });
  });
});
