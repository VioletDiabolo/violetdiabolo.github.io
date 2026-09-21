import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// stage.css was the 3D stage's own stylesheet and is gone with it (this branch strips
// the object); only these two remain.
const allCss = () =>
  ['../src/styles/base.css', '../src/styles/sections.css']
    .map(read).join('\n');

/**
 * Every `.js` path under src/, recursively. Mirrors tests/lifecycle.test.js's
 * listJsFiles walk (readdirSync + statSync, recursing into directories), wrapped as a
 * zero-arg function since that is how this file's own tests call it.
 */
function sourceFiles() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = path.join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.js')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

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
 * the moment the stylesheet was rewritten around rooms. `[data-room` became `[data-panel`
 * when rooms were renamed to panels for the same reason: the rule being enforced is about
 * WHERE a background may be declared, so its reach has to follow the text selectors,
 * wherever the stylesheet moves them next. `[data-surface` joined alongside it for the
 * same forward-looking reason, even though today's `[data-surface=...]` rules target the
 * section itself rather than a heading or paragraph within it.
 */
function targetsHeadingOrParagraph(selector) {
  if (!/^(\.section\b|\[data-section\b|\[data-side\b|\[data-panel\b|\[data-surface\b|\.room\b)/.test(selector)) return false;
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

  it('numbers no section with a CSS counter', () => {
    expect(allCss()).not.toMatch(/counter-(reset|increment)|counter\(/);
  });

  it('outlines no text — a stroke is a symptom of text laid over the object', () => {
    expect(allCss()).not.toMatch(/-webkit-text-stroke/);
  });
});

describe('glass', () => {
  it('blurs only behind glass panels', () => {
    // The blanket ban existed because backdrop-filter was being used to rescue text
    // laid over the 3D object. That object is gone; glass panels are a deliberate
    // surface. The ban is narrowed, not lifted: still nothing blurred behind plain text.
    for (const rule of leafRules(allCss())) {
      if (!/backdrop-filter/.test(rule.body)) continue;
      expect(rule.selector, `${rule.selector} blurs without being glass`)
        .toMatch(/\[data-surface=['"]?glass/);
    }
  });

  it('styles both surfaces', () => {
    const css = read('../src/styles/sections.css');
    for (const surface of ['solid', 'glass']) {
      expect(css).toMatch(new RegExp(`\\[data-surface=["']?${surface}`));
    }
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

  it('leaves mono loaded despite its one user being gone, pending a styling call', () => {
    // Space Mono was the 3D part labels' and nothing else's (index.html's own comment
    // said so); the object is gone (this branch strips it), so nothing on the page sets
    // --font-mono any more. Left loaded rather than pulled here -- deciding whether it
    // survives is a styling call for a later task, not this one.
    expect(read('../index.html')).toMatch(/Space\+Mono/);
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

describe('the four panel patterns', () => {
  it('styles every panel pattern', () => {
    // The old version of this test also asserted the story panel (then 'panel') carried
    // an opaque background -- true when it was the one printed sheet covering the 3D
    // object. It is glass now (`[data-surface='glass']`, deliberately, so the gradient
    // shows through): that assertion is gone with the premise, not merely unported, and
    // 'glass > styles both surfaces' below covers the surface system that replaced it.
    const css = read('../src/styles/sections.css');
    for (const panel of ['hero', 'story', 'feature', 'grid']) {
      expect(css, `${panel} has no styling`).toMatch(new RegExp(`\\[data-panel=["']?${panel}["']?\\]`));
    }
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
    expect(read('../src/styles/base.css')).toMatch(/--accent/);
  });

  it('never takes a focus ring away', () => {
    // :focus-visible is a global rule in base.css, but a single `outline: none` on a
    // restyled control silently undoes it for that control alone, and nothing else on
    // the page would look any different. Cheap to assert, impossible to notice by eye.
    expect(allCss()).not.toMatch(/outline:\s*(none|0)\b/);
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
 * "`[data-panel='story'] :focus-visible { outline-color: var(--accent-ink) }` used to sit
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
   * declared in the stylesheets, so either one going stale would show up here as a
   * failure to find it rather than as a silently shorter list.
   *
   * The violet ground used to be the story panel's own full-bleed --accent sheet; it is
   * glass now (`[data-surface='glass']`, sections.css), a translucent mix over whatever
   * the moving gradient is doing, which is not a fixed token this suite can sample. What
   * is still a fixed, live --accent fill is the nav's own call-to-action chip and the
   * feature panel's form buttons -- real opaque accent grounds the ring still has to
   * work against, which is what the self-check below confirms still exists.
   */
  const grounds = () => {
    const t = tokens();
    const sections = read('../src/styles/sections.css');
    expect(sections, 'the accent-filled form button no longer exists, so this list of ' +
      'grounds is out of date').toMatch(/\.form-card button\s*\{[^}]*background:\s*var\(--accent\)/);
    return [
      ['the near-black page ground', t['--stage']],
      ['an opaque accent fill (the nav CTA, the form buttons)', t['--accent']],
    ];
  };

  it('is invisible against accent without an override, which is why the override exists', () => {
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

  it('keeps a band that reads on the page ground AND against accent, for the nav and the story panel', () => {
    const t = tokens();
    const css = baseCss();

    // The one rule that carries the two-tone ring, whatever its selector list has grown to.
    const rule = css.match(/([^{}]*:focus-visible[^{}]*)\{([^}]*outline-color[^}]*)\}/);
    expect(rule, 'nothing overrides the focus ring any more -- against the nav\'s own ' +
      'accent-filled chips, or the feature panel\'s form buttons, it is accent on accent, ' +
      '1.00:1, and a keyboard user cannot see where they are')
      .not.toBeNull();

    const selectors = rule[1].split(',').map((s) => s.trim()).filter(Boolean);
    // Both contexts that can end up on an opaque accent fill have to be covered. The nav
    // is a sibling of #content (main.js prepends it to <body>), so a [data-panel='story']
    // selector can never reach it and it needs naming separately -- that is the trap the
    // rule this replaced fell into.
    expect(selectors.some((s) => /\.site-nav\b/.test(s)),
      "the fixed nav is no longer covered, and every one of its own chips is opaque " +
      '--surface or --accent')
      .toBe(true);
    expect(selectors.some((s) => /\[data-panel='story'\]/.test(s)),
      "the story panel's own focusable content is no longer covered; a link in the club's " +
      'story sits on glass over an unpredictable, moving gradient -- the one ground this ' +
      'ring cannot afford to assume is safe')
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
    // unfocused against violet. This keeps at least two.
    const css = baseCss();
    const width = Number(css.match(/:focus-visible\s*\{[^}]*outline:\s*(\d+)px/)[1]);
    const offset = Number(css.match(/:focus-visible\s*\{[^}]*outline-offset:\s*(\d+)px/)[1]);
    const spread = Number(css.match(/:focus-visible[^{}]*\{[^}]*box-shadow:[^;]*?(\d+)px\s+var\(/)[1]);
    expect(spread - (offset + width),
      `the outer band is ${spread - (offset + width)}px wide (outline ${width}px at offset ` +
      `${offset}px under a ${spread}px spread) -- against violet that band is the only part ` +
      'of the ring that contrasts at all, and at 1px any rounding erases it')
      .toBeGreaterThanOrEqual(2);
  });
});

describe('the 3D system is gone', () => {
  it('ships no three.js dependency', () => {
    const pkg = JSON.parse(read('../package.json'));
    expect(pkg.dependencies.three, 'three is still a dependency').toBeUndefined();
  });

  it('leaves no diabolo module behind', () => {
    expect(existsSync(new URL('../src/diabolo', import.meta.url))).toBe(false);
  });

  it('imports three nowhere in src', () => {
    // A stale import survives deletion of its subject and fails only at build time.
    for (const file of sourceFiles()) {
      expect(read(file), `${file} still imports three`).not.toMatch(/from ['"]three['"]/);
    }
  });

  // 'sticks nothing to the viewport' moved to tests/sections-layout.dom.test.js. A
  // source-text grep for the literal string is fooled in both directions -- it fails on
  // the phrase merely appearing in a comment (this happened twice over during this
  // branch's own history) and cannot see whether a matched declaration actually wins the
  // cascade. The replacement resolves the real cascade over the real rendered DOM
  // (Element.matches + specificity arithmetic), which needs jsdom; this file runs in the
  // plain node environment (see `read()` above, which breaks under vitest's jsdom
  // environment), so the guard now lives next to the other cascade-resolution guard
  // built the same way ("the grid room title size").
});

describe('the moving-background contrast guard', () => {
  it('keeps the contrast helper out of the shipped bundle', () => {
    // It is test and probe tooling. If main.js ever imports it, it starts costing
    // every visitor bytes they gain nothing from.
    expect(read('../src/main.js')).not.toMatch(/gradient\/contrast/);
  });
});
