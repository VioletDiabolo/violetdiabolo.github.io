import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const allCss = () =>
  ['../src/styles/base.css', '../src/styles/sections.css', '../src/styles/stage.css']
    .map(read).join('\n');

/**
 * Splits a CSS source into its leaf declaration blocks — {selector, body} for every
 * rule whose body holds no nested braces — recursing into at-rules (@media) so their
 * inner rules are inspected too. A hand-rolled brace-depth scan, not a full parser:
 * this file's CSS never nests deeper than one @media, which is all this needs.
 */
function leafRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  function scan(source) {
    let i = 0;
    while (i < source.length) {
      const brace = source.indexOf('{', i);
      if (brace === -1) break;
      const selector = source.slice(i, brace).trim();
      let depth = 1;
      let j = brace + 1;
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
        j++;
      }
      const body = source.slice(brace + 1, j - 1);
      if (body.includes('{')) scan(body);
      else rules.push({ selector, body });
      i = j;
    }
  }
  scan(stripped);
  return rules;
}

/**
 * True for a single (already comma-split, trimmed) selector that targets a held
 * heading or paragraph — `.section > h1`, `[data-section] p`, `[data-side='center'] h2`
 * and the like — regardless of combinator or attached pseudo-classes.
 *
 * `[data-room` and `.room` joined the prefix list when the four room patterns landed:
 * every heading and paragraph on the page is now addressed through one of those two, so
 * a guard that still knew only the three older prefixes would have gone quietly vacuous
 * the moment the stylesheet was rewritten around rooms. The rule being enforced is about
 * WHERE a background may be declared, so its reach has to follow the text selectors.
 */
function targetsHeadingOrParagraph(selector) {
  if (!/^(\.section\b|\[data-section\b|\[data-side\b|\[data-room\b|\.room\b)/.test(selector)) return false;
  const lastToken = selector.split(/[\s>+~]+/).filter(Boolean).pop() ?? '';
  const bareTag = lastToken.replace(/::?[\w-]+(\([^)]*\))?/g, '').replace(/\[[^\]]*\]/g, '');
  return bareTag === 'h1' || bareTag === 'h2' || bareTag === 'p';
}

/** Every rule that targets held heading/paragraph text and declares a background. */
function textSelectorsWithBackground(css) {
  const violations = [];
  for (const { selector, body } of leafRules(css)) {
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.some(targetsHeadingOrParagraph)) continue;
    const declaration = body.split(';').find((decl) => /^\s*background(-color)?\s*:/.test(decl));
    if (declaration) violations.push({ selector, declaration: declaration.trim() });
  }
  return violations;
}

describe('the technical-drawing language is gone', () => {
  it('draws no grid across the page', () => {
    expect(allCss()).not.toMatch(/repeating-linear-gradient/i);
  });

  it('keeps no hairline-rule token', () => {
    expect(allCss()).not.toMatch(/--rule\b/);
  });

  it('declares no background on the held heading/paragraph selectors', () => {
    // Plates existed only because the object sat under the text; the object now moves
    // aside instead, so a plate reappearing means the composition regressed. This used
    // to be a literal substring grep for "plate", which cut both ways: a rule adding
    // `background: rgba(...)` behind .section > h1/h2/p doesn't contain that substring
    // and passed silently, while `grid-template-columns` does contain it ("tem-PLATE-
    // columns") and false-tripped on wholly unrelated layout code — see sections.css's
    // .board-list/.media-list/.form-list, restated via the `grid` shorthand purely to
    // dodge that accident. A property-level check on the actual text selectors replaces
    // both failure modes at once.
    const violations = textSelectorsWithBackground(read('../src/styles/sections.css'));
    expect(violations, JSON.stringify(violations)).toEqual([]);
  });

  it('applies no backdrop-filter anywhere', () => {
    expect(allCss()).not.toMatch(/backdrop-filter/i);
  });

  it('numbers no section with a CSS counter', () => {
    expect(allCss()).not.toMatch(/counter-(reset|increment)|counter\(/);
  });

  it('draws no leader lines from the labels', () => {
    expect(read('../src/styles/stage.css')).not.toMatch(/\.part-label::before/);
  });

  it('outlines no text — a stroke is a symptom of text laid over the object', () => {
    expect(allCss()).not.toMatch(/-webkit-text-stroke/);
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

describe('the light spill is gone', () => {
  it('leaves no spill module behind', () => {
    expect(existsSync(new URL('../src/diabolo/spill.js', import.meta.url))).toBe(false);
  });

  it('positions nothing from the spill custom properties', () => {
    // The bloom tracked a glossy object's screen position. An unlit object emits nothing,
    // so a gradient still following it would be decoration with no idea behind it.
    expect(allCss()).not.toMatch(/--spill-[xy]/);
    expect(allCss()).not.toMatch(/light-spill/);
  });

  it('mounts no spill layer', () => {
    expect(read('../index.html')).not.toMatch(/spill-layer/);
  });
});

describe('the reading column', () => {
  it('is placed by side, not run full width', () => {
    const css = read('../src/styles/sections.css');
    expect(css).toMatch(/\[data-side=["']?left["']?\]/);
    expect(css).toMatch(/\[data-side=["']?right["']?\]/);
  });
});

describe('the four room patterns', () => {
  it('styles every room pattern', () => {
    const css = read('../src/styles/sections.css');
    for (const room of ['hero', 'panel', 'showcase', 'grid']) {
      expect(css, `${room} has no styling`).toMatch(new RegExp(`\\[data-room=["']?${room}["']?\\]`));
    }
  });

  it('gives the panel an opaque background, which is what makes it cover the object', () => {
    // The slide-up is free: #stage is sticky and #content scrolls over it. A transparent
    // panel would simply fail to cover anything.
    const css = read('../src/styles/sections.css');
    const panel = css.slice(css.search(/\[data-room=['"]?panel/));
    expect(panel.slice(0, 600)).toMatch(/background/);
  });
});

describe('the nav', () => {
  it('is styled', () => {
    expect(read('../src/styles/base.css') + read('../src/styles/sections.css'))
      .toMatch(/\.site-nav/);
  });

  it('marks the call to action apart from the pills', () => {
    expect(read('../src/styles/base.css') + read('../src/styles/sections.css'))
      .toMatch(/\.site-nav-cta/);
  });
});

describe('accent discipline', () => {
  it('keeps the page accent as a named token', () => {
    // The object's accent is the red gasket, set in materials.js; the page's is violet.
    // They live at different scopes and must not be collapsed into one value.
    expect(read('../src/styles/base.css')).toMatch(/--accent/);
  });

  it('never takes a focus ring away', () => {
    // :focus-visible is a global rule in base.css, but a single `outline: none` on a
    // restyled control silently undoes it for that control alone, and nothing else on
    // the page would look any different. Cheap to assert, impossible to notice by eye.
    expect(allCss()).not.toMatch(/outline:\s*(none|0)\b/);
  });
});

describe('the narrow-screen composition', () => {
  it('dims no canvas — the object holds a band of its own instead of hiding under text', () => {
    // The rejected mitigation: fade the object to 30% and run text straight over it.
    // The composition below replaces it, and this is what stops it coming back.
    const offenders = leafRules(read('../src/styles/stage.css'))
      .filter(({ selector, body }) => /canvas|#stage\b/.test(selector))
      .filter(({ body }) => /(^|[;\s])opacity\s*:\s*0?\.\d/.test(body));
    expect(offenders.map((r) => r.selector), 'the canvas is dimmed again').toEqual([]);
  });

  it('gives the object its own band, short enough to read beneath', () => {
    const css = read('../src/styles/stage.css');
    const at = css.search(/@media\s*\(max-width:\s*767px\)/);
    expect(at, 'no narrow-screen block at all').toBeGreaterThan(-1);
    const band = css.slice(at).match(/#stage\s*\{[^}]*height:\s*(\d+)dvh/);
    expect(band, 'the stage still spans the whole viewport on a phone').not.toBeNull();
    expect(Number(band[1]), 'the band leaves no room to read beneath it').toBeLessThan(60);
  });
});
