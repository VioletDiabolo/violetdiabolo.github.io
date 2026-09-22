import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { TARGETS, prepare } from '../scripts/build-assets.mjs';

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

  it('declares every master that content references', () => {
    const names = TARGETS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['group-usadc', 'usadc-wide', 'aaron', 'jon']));
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
