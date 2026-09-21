// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom environment,
// Vitest's global URL shim resolves relative file: URLs against http://localhost:3000
// instead of the filesystem, which breaks fs.readFileSync(url) (see the identical
// workaround in tests/ui.dom.test.js's "content boundary" test).
const SECTIONS_CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');

describe('the grid room title size', () => {
  it("is not swallowed by the shared title-size rule (dead-by-specificity guard)", () => {
    // The historical bug: `.section:not([data-section='hero']):not([data-room='panel'])
    // h2` was meant to size every room's h2 except hero (its own h1, elsewhere) and panel
    // (its own h2, above it in the file), trusting the grid room's OWN rule just below it
    // to win for grid by coming later in the file. It never could: :not() takes the
    // specificity of its own argument, so that selector was (0,3,1) against the grid
    // rule's (0,1,1), and the LESS specific grid rule lost on font-size regardless of
    // source order -- media, board and contact rendered at up to 68px (--type-title's
    // ceiling) inside a label column of at most 208px. Fixed by naming the one room the
    // shared rule is actually for ([data-room='showcase'] h2) instead of trying to
    // out-rank a selector it was never meant to compete with.
    //
    // Checked with the real selector engine (Element.matches), not hand-rolled
    // specificity arithmetic -- hand-rolled arithmetic is exactly what produced the bug.
    // Whatever rule currently sets --type-title on a room's h2 must not ALSO match a
    // grid room's h2, independent of which one the cascade would pick if it did.
    // Comments stripped first: they contain no braces of their own, so left in, the
    // greedy `[^{}]+` below walks straight through one and captures a comment's prose
    // as if it were the selector -- caught by running this once with the comment left in.
    // matchAll, not match: without the /g flag this inspected the FIRST --type-title rule
    // and nothing else, so the guard only ever covered a REPLACEMENT of that rule. Adding
    // a second one further down the file -- which is the ordinary way a stylesheet grows,
    // and exactly how the original defect arrived -- went unseen. The falsification that
    // signed this off exercised a replacement and not an addition, so the gap survived it.
    const css = readFileSync(SECTIONS_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]+)\{\s*font-size:\s*var\(--type-title\);?\s*\}/g)];
    expect(rules.length, 'no rule sets --type-title on an h2 any more -- update this test to match')
      .toBeGreaterThan(0);

    document.body.innerHTML = `
      <section class="section" data-section="media" data-room="grid">
        <div class="room"><div class="room-head"><h2>Media</h2></div></div>
      </section>`;
    const h2 = document.querySelector('h2');
    const leaking = rules
      .flatMap((rule) => rule[1].trim().split(',').map((s) => s.trim()))
      .filter((s) => h2.matches(s));
    expect(leaking, "a rule setting --type-title also matches a grid room's h2").toEqual([]);
  });

  it('gives the grid room its own, smaller h2 rule, so the guard above has something to protect', () => {
    // Without this, the test above would pass just as well if the grid rule were ever
    // deleted outright rather than merely shadowed -- "no shared rule matches" is not the
    // same claim as "the grid room is sized correctly", and this is what tells them apart.
    const css = readFileSync(SECTIONS_CSS, 'utf8');
    expect(css).toMatch(/\[data-room='grid'\]\s*h2\s*\{[^}]*font-size:\s*clamp\(/);
  });
});
