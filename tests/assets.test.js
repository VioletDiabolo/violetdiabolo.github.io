import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { TARGETS } from '../scripts/build-assets.mjs';

describe('image pipeline', () => {
  it('declares every master that content references', () => {
    const names = TARGETS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['group-usadc', 'usadc-wide', 'aaron', 'jon']));
  });

  it('caps widths at 2000, since 2400 cannot meet the size budget at usable quality', () => {
    for (const t of TARGETS) expect(Math.max(...t.widths)).toBeLessThanOrEqual(2000);
  });

  it('emits no last-resort JPEG at the largest width', () => {
    for (const t of TARGETS) {
      if (t.jpgWidths.length === 0) continue;
      expect(Math.max(...t.jpgWidths)).toBeLessThan(Math.max(...t.widths));
    }
  });

  it('emits an 800px derivative for each board portrait', () => {
    for (const name of ['aaron', 'jon']) {
      const t = TARGETS.find((x) => x.name === name);
      expect(t.widths).toContain(800);
    }
  });

  it.runIf(existsSync('public/images'))('ships no image over 400 KB', () => {
    const files = readdirSync('public/images');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const kb = statSync(`public/images/${f}`).size / 1024;
      expect(kb, `${f} is ${kb.toFixed(0)} KB`).toBeLessThan(400);
    }
  });
});
