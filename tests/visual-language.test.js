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

/** The object band's height on a phone, in dvh, read from the file that declares it. */
function bandDvh() {
  const css = read('../src/styles/stage.css');
  const at = css.search(/@media\s*\(max-width:\s*767px\)/);
  expect(at, 'no narrow-screen block at all').toBeGreaterThan(-1);
  const band = css.slice(at).match(/#stage\s*\{[^}]*height:\s*(\d+)dvh/);
  expect(band, 'the stage still spans the whole viewport on a phone').not.toBeNull();
  return Number(band[1]);
}

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
    expect(bandDvh(), 'the band leaves no room to read beneath it').toBeLessThan(60);
  });

  it('lands a jump link clear of the band, by reading the same number the band is set to', () => {
    // Task 5 fixed this and left the two numbers coupled by a comment alone -- base.css's
    // narrow-screen [data-section] { scroll-margin-top: 40dvh } claiming it "stays locked"
    // to stage.css's #stage { height: 40dvh }. Nothing checked it. Retune the band and
    // every jump link on a phone silently parks its heading behind it again: the nav's
    // four section links are the main way anyone reaches the club's videos, roster and
    // contact details on a phone, and the failure is invisible from the stylesheet, which
    // still reads as though the two agreed.
    //
    // --nav-h is what this used to be, and it is the wrong obstruction below 768px: the
    // nav is ~52-57px there and sits ON TOP of a 324.8px band, so it is the band's height
    // a landing has to clear, not the bar's. Measured before the fix: a landed heading and
    // its first paragraph sat roughly 268px up behind the band.
    const css = read('../src/styles/base.css');
    const at = css.search(/@media\s*\(max-width:\s*767px\)[^{]*\{[\s\S]*?\[data-section\]/);
    expect(at, 'base.css no longer offsets a jump link at all on a phone').toBeGreaterThan(-1);
    const offset = css.slice(at).match(/\[data-section\]\s*\{[^}]*scroll-margin-top:\s*(\d+)dvh/);
    expect(offset, "the phone jump-link offset is no longer a dvh share of the viewport, so it " +
      'cannot be compared with the band at all -- restate it in the band\'s own unit').not.toBeNull();
    expect(Number(offset[1]),
      'a jump link no longer lands clear of the object band: scroll-margin-top and #stage\'s ' +
      'narrow-screen height have come apart, so a landed section\'s heading sits behind an ' +
      'opaque band that also swallows its taps')
      .toBe(bandDvh());
  });
});

/* ---------------------------------------------------------------------------
 * The focus ring, on both grounds it is ever laid over.
 *
 * `:focus-visible { outline: 2px solid var(--accent) }` is 7.14:1 on the near-black ground
 * the page mostly is, and 1.00:1 on the panel room's full-bleed --accent sheet -- accent
 * on accent, literally no ring. Two things sit on that sheet: the fixed nav, which scrolls
 * over the whole 216vh of it, and anything focusable inside the room itself. The override
 * that rescues both is a single rule, and until now nothing in this suite mentioned it:
 * delete it and keyboard focus is invisible for a sixth of the page with a green suite.
 *
 * Asserting the rule EXISTS would be the weak version of this -- it would pass on a rule
 * that set the ring to another invisible colour. What is asserted instead is the property
 * the two tones exist to provide: between them, some band of the ring clears 3:1 against
 * every ground the ring is laid over. The ratios are recomputed here from the tokens in
 * base.css by the WCAG formula, so changing a token to something that no longer works
 * fails this too, not just deleting the rule.
 * ------------------------------------------------------------------------- */

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * base.css with its comments removed. Every match below has to run against this rather
 * than the raw file: base.css's accessibility block quotes a whole CSS rule in prose --
 * "`[data-room='panel'] :focus-visible { outline-color: var(--accent-ink) }` used to sit
 * here as the fix" -- and a greedy `[^{}]*` walks straight into it and captures the
 * COMMENT as if it were the live rule. Caught by running this once without the strip: it
 * reported a one-tone ring that does not exist anywhere in the file. The identical
 * workaround, for the identical reason, is in tests/sections-layout.dom.test.js.
 */
const baseCss = () => read('../src/styles/base.css').replace(/\/\*[\s\S]*?\*\//g, '');

/** The :root colour tokens, read from the file that declares them. */
function tokens() {
  const css = baseCss();
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  return Object.fromEntries(
    [...root.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]),
  );
}

describe('the focus ring on every ground it is laid over', () => {
  /** Contrast a ring band must reach to read as a band at all (WCAG non-text, 1.4.11). */
  const MIN = 3;

  /**
   * The grounds a focus ring is drawn on, and why each one is in the list. Both are
   * declared in the stylesheets, so a room that stopped being violet would show up here
   * as a failure to find it rather than as a silently shorter list.
   */
  const grounds = () => {
    const t = tokens();
    const sections = read('../src/styles/sections.css');
    expect(sections, "the panel room no longer fills itself with the accent, so this list of " +
      'grounds is out of date').toMatch(/\[data-room='panel'\]\s*\{[^}]*background:\s*var\(--accent\)/);
    return [
      ['the near-black page ground', t['--stage']],
      ['the panel room\'s violet sheet', t['--accent']],
    ];
  };

  it('is invisible on the panel without an override, which is why the override exists', () => {
    // The negative control. Without it the test below could pass on a page where the
    // default ring was already fine everywhere and the override was decoration.
    const t = tokens();
    const css = baseCss();
    const global = css.match(/(?:^|\n):focus-visible\s*\{[^}]*outline:\s*[^;]*var\((--[\w-]+)\)/);
    expect(global, 'there is no global focus ring at all any more').not.toBeNull();
    const ring = t[global[1]];
    expect(contrast(ring, t['--stage']), 'the global ring stopped working on the page ground')
      .toBeGreaterThanOrEqual(MIN);
    expect(contrast(ring, t['--accent']),
      'the global ring now works on the violet too -- if that is deliberate, this whole ' +
      'block and the override it guards can go')
      .toBeLessThan(MIN);
  });

  it('keeps a band that reads on the page ground AND on the panel, for the nav and the panel room', () => {
    const t = tokens();
    const css = baseCss();

    // The one rule that carries the two-tone ring, whatever its selector list has grown to.
    const rule = css.match(/([^{}]*:focus-visible[^{}]*)\{([^}]*outline-color[^}]*)\}/);
    expect(rule, 'nothing overrides the focus ring any more -- on the panel it is now ' +
      'accent on accent, 1.00:1, and a keyboard user cannot see where they are')
      .not.toBeNull();

    const selectors = rule[1].split(',').map((s) => s.trim()).filter(Boolean);
    // Both contexts that are laid over the violet have to be covered. The nav is a sibling
    // of #content (main.js prepends it to <body>), so a [data-room='panel'] selector can
    // never reach it and it needs naming separately -- that is the trap the rule this
    // replaced fell into.
    expect(selectors.some((s) => /\.site-nav\b/.test(s)),
      'the fixed nav is no longer covered, and it is over the violet sheet for 216vh')
      .toBe(true);
    expect(selectors.some((s) => /\[data-room='panel'\]/.test(s)),
      "the panel room's own focusable content is no longer covered; a link in the club's " +
      'story would get a 1.00:1 ring')
      .toBe(true);

    const body = rule[2];
    const bands = [...body.matchAll(/var\((--[\w-]+)\)/g)].map((m) => t[m[1]]);
    expect(bands.filter(Boolean).length,
      'the ring is down to one tone, so it cannot be correct on two different grounds')
      .toBeGreaterThanOrEqual(2);

    for (const [name, ground] of grounds()) {
      const best = Math.max(...bands.map((band) => contrast(band, ground)));
      expect(best, `no band of the focus ring reaches ${MIN}:1 on ${name} -- best is ` +
        `${best.toFixed(2)}:1, so focus is invisible there`).toBeGreaterThanOrEqual(MIN);
    }
  });

  it('spreads the outer band wider than the outline it has to show past', () => {
    // The band that carries the violet is the shadow's, and only the part of it OUTSIDE
    // the outline is visible: with outline 2px at offset 3px over a spread of S, the
    // painted bands are stage [0,3), ink [3,5), stage [5,S). At S = 6 that last band is
    // one CSS pixel, and one pixel is the whole of the difference between focused and
    // unfocused on the panel. This keeps at least two.
    const css = baseCss();
    const width = Number(css.match(/:focus-visible\s*\{[^}]*outline:\s*(\d+)px/)[1]);
    const offset = Number(css.match(/:focus-visible\s*\{[^}]*outline-offset:\s*(\d+)px/)[1]);
    const spread = Number(css.match(/:focus-visible[^{}]*\{[^}]*box-shadow:[^;]*?(\d+)px\s+var\(/)[1]);
    expect(spread - (offset + width),
      `the outer band is ${spread - (offset + width)}px wide (outline ${width}px at offset ` +
      `${offset}px under a ${spread}px spread) -- on the panel that band is the only part ` +
      'of the ring that contrasts at all, and at 1px any rounding erases it')
      .toBeGreaterThanOrEqual(2);
  });
});
