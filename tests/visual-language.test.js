import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const allCss = () =>
  ['../src/styles/base.css', '../src/styles/sections.css', '../src/styles/stage.css']
    .map(read).join('\n');

describe('the technical-drawing language is gone', () => {
  it('draws no grid across the page', () => {
    expect(allCss()).not.toMatch(/repeating-linear-gradient/i);
  });

  it('keeps no hairline-rule token', () => {
    expect(allCss()).not.toMatch(/--rule\b/);
  });

  it('paints no plate behind text', () => {
    // The plates existed only because the object sat under the text. The object now moves
    // aside, so a plate reappearing means the composition regressed.
    expect(allCss()).not.toMatch(/plate|backdrop-filter/i);
  });

  it('numbers no section with a CSS counter', () => {
    expect(allCss()).not.toMatch(/counter-(reset|increment)|counter\(/);
  });

  it('draws no leader lines from the labels', () => {
    expect(read('../src/styles/stage.css')).not.toMatch(/\.part-label::before/);
  });
});

describe('the editorial pairing', () => {
  it('loads Instrument Serif and Inter', () => {
    const html = read('../index.html');
    expect(html).toMatch(/Instrument\+Serif/);
    expect(html).toMatch(/family=Inter/);
  });

  it('drops Space Grotesk, which was the technical voice', () => {
    expect(read('../index.html')).not.toMatch(/Space\+Grotesk/);
  });

  it('keeps mono loaded, because the 3D part labels still use it', () => {
    expect(read('../index.html')).toMatch(/Space\+Mono/);
  });

  it('uses mono only on the object labels, never in the reading column', () => {
    expect(read('../src/styles/stage.css')).toMatch(/\.part-label/);
    expect(read('../src/styles/sections.css')).not.toMatch(/Space Mono|monospace/i);
  });
});

describe('the light spill is wired to the object', () => {
  it('positions the bloom from the properties the overlay writes', () => {
    const stage = read('../src/styles/stage.css');
    expect(stage).toMatch(/var\(--spill-x/);
    expect(stage).toMatch(/var\(--spill-y/);
  });
});

describe('the reading column', () => {
  it('is placed by side, not run full width', () => {
    const css = read('../src/styles/sections.css');
    expect(css).toMatch(/\[data-side=["']?left["']?\]/);
    expect(css).toMatch(/\[data-side=["']?right["']?\]/);
  });
});
