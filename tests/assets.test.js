import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { TARGETS } from '../scripts/build-assets.mjs';

describe('image pipeline', () => {
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
