import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// Imported, not re-declared: "the gradient's luminance ceiling" below is the one guard
// in this file that has to agree with what the shader actually emits, so it reads the
// same stops gradient.js uploads as uniforms.
import { PALETTE } from '../src/gradient/palette.js';

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

  it('asks for no third family, now that the one that used mono is gone', () => {
    // This test used to assert the OPPOSITE -- that Space Mono was still requested --
    // and it was right to: the note beside it said deciding whether the family survives
    // was "a styling call for a later task, not this one", and until the design pass
    // there was no task that owned the call. The design pass owns it, and made it: Space
    // Mono set the 3D object's part labels and nothing else, that object was deleted
    // earlier on this branch, and --font-mono / --mono-2xs / --mono-xs have been sitting
    // in base.css at zero uses ever since. A page should not request a webfont it has no
    // glyph to set, so the family and the three dead tokens go together.
    //
    // Rewritten rather than deleted, because the claim worth keeping is the one that
    // outlives either answer: whatever families index.html asks for, the stylesheets
    // have to actually set them, and vice versa.
    // Comments stripped from both sides first. base.css and index.html each explain in
    // prose WHY the mono face went, naming it and its three tokens, and the first run of
    // this guard failed on exactly that prose -- the same "a guard cannot tell a defect
    // from its own obituary" trap the shader guards below hit.
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    const html = strip(read('../index.html'));
    const css = strip(allCss());
    expect(html, 'Space Mono is requested again; if something now sets it, say what')
      .not.toMatch(/Space\+Mono/);
    expect(css, 'a stylesheet sets a mono face that index.html no longer loads')
      .not.toMatch(/Space Mono/);
    expect(css, '--font-mono is back with no user')
      .not.toMatch(/--font-mono|--mono-2xs|--mono-xs/);

    // Every family the page DOES request is set by a token, and every token's family is
    // requested. This is the part that cannot go stale.
    const requested = [...html.matchAll(/family=([A-Za-z+]+)/g)].map((m) => m[1].replace(/\+/g, ' '));
    expect(requested.sort()).toEqual(['Instrument Serif', 'Inter']);
    for (const family of requested) {
      expect(css, `${family} is loaded but no token sets it`).toMatch(new RegExp(`'${family}'`));
    }
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

/* ---------------------------------------------------------------------------
 * The gradient's luminance ceiling.
 *
 * This is the load-bearing fact of the whole design pass and nothing in the suite knew
 * about it. Every colour the fragment shader can emit is a component-wise mix along
 * deep -> mid -> bright (src/gradient/shader.js mixes exactly those three, in that
 * order), and each stop is component-wise greater than the one below it -- so `bright`
 * is not a sampled maximum, it is an ARITHMETIC ceiling on what the canvas can draw.
 *
 * That ceiling is why the hero's headline and tagline sit on bare canvas with no plate,
 * no scrim and no shader vignette, and why the panels' alphas are the numbers they are.
 * Raise `bright` and every one of those decisions silently becomes wrong while the page
 * still looks fine on the frames anyone happens to screenshot -- which is precisely how
 * the shader this replaces shipped with a `bright` at luminance 0.542, where --ink
 * measures 1.60:1 and the hero title was reported as "nearly invisible".
 * ------------------------------------------------------------------------- */

describe("the gradient's luminance ceiling", () => {
  /** WCAG relative luminance of an [r, g, b] triple in 0-1, as the shader emits them. */
  const lum01 = ([r, g, b]) => {
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [a, b].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const hex01 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  it('orders the stops component-wise, so `bright` really is the ceiling', () => {
    // Not the same claim as palette.test.js's "runs dark to light", which compares
    // luminance. Luminance ordering permits a mix that is brighter in one channel than
    // either endpoint; component-wise ordering is what makes "no output exceeds bright"
    // true for every channel, and every contrast figure in base.css depends on it.
    for (const [lower, upper] of [['deep', 'mid'], ['mid', 'bright']]) {
      for (let c = 0; c < 3; c++) {
        expect(PALETTE[upper][c], `${upper}[${c}] is below ${lower}[${c}], so a mix of ` +
          'them can leave the range and the ceiling below means nothing')
          .toBeGreaterThanOrEqual(PALETTE[lower][c]);
      }
    }
  });

  it('keeps --ink readable on the brightest pixel the shader can emit', () => {
    // 4.5:1 is WCAG AA for body text, and body text is what sits out there: the hero's
    // tagline at 13px and the footer line at 12.5px are both on bare canvas.
    const ink = lum01(hex01(tokens()['--ink']));
    const measured = ratio(ink, lum01(PALETTE.bright));
    expect(measured, `--ink measures ${measured.toFixed(2)}:1 against the gradient's ` +
      'brightest possible pixel. Below 4.5 the hero tagline and the footer line are no ' +
      'longer AA on bare canvas, and nothing on the page plates them.')
      .toBeGreaterThanOrEqual(4.5);
  });

  it('is the reason dim text never goes on bare canvas', () => {
    // The negative control. --ink-dim is the page's de-emphasis tone and it is fine on
    // every surface; it is NOT fine on the gradient, which is why base.css states the
    // rule and why the two bare-canvas text rules below take --ink instead. If this ever
    // passes 4.5, the rule can be relaxed -- but it should be relaxed deliberately.
    const dim = lum01(hex01(tokens()['--ink-dim']));
    expect(ratio(dim, lum01(PALETTE.bright))).toBeLessThan(4.5);
  });

  it('puts --ink, not --ink-dim, on the two text blocks with no surface under them', () => {
    const css = read('../src/styles/sections.css').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [label, selector] of [
      ['the hero tagline', "\\[data-panel='hero'\\] \\.room-head p"],
      ['the footer line', '\\.footer-line'],
    ]) {
      const rule = css.match(new RegExp(`${selector}\\s*\\{[^}]*\\}`));
      expect(rule, `${label} has no rule any more -- update this guard`).not.toBeNull();
      expect(rule[0], `${label} sits on bare canvas and must take var(--ink)`)
        .toMatch(/color:\s*var\(--ink\)\s*;/);
    }
  });
});

/* ---------------------------------------------------------------------------
 * The two shader defects, kept fixed.
 *
 * Neither is visible to the unit suite: tests/helpers/webgl-stub.js reports
 * COMPILE_STATUS and LINK_STATUS true unconditionally, so the GLSL below could say
 * anything at all and every other test in this repo would still pass. These two guards
 * read the source text because that is the only thing available here; the real check is
 * scripts/check-shader.html, which compiles it on a GPU.
 * ------------------------------------------------------------------------- */

describe('the shader defects this pass fixed', () => {
  /**
   * The GLSL itself: the body of the FRAGMENT_SHADER template literal, with its own //
   * comments stripped.
   *
   * Scoped this narrowly because both guards below failed on their first run against the
   * whole file, and both for the same reason: shader.js's header comment WRITES OUT the
   * two defects it fixed, quoting `mat2(cos(a), -sin(a), sin(a), cos(a))` and "three
   * `band +=` terms". A guard that greps the file cannot tell a defect from its own
   * obituary — the same trap tests/sections-layout.dom.test.js records hitting twice.
   */
  const frag = () => {
    const src = read('../src/gradient/shader.js');
    const marker = 'FRAGMENT_SHADER = `';
    const start = src.indexOf(marker);
    expect(start, 'FRAGMENT_SHADER is no longer a template literal').toBeGreaterThan(-1);
    const rest = src.slice(start + marker.length);
    return rest.slice(0, rest.indexOf('`')).replace(/\/\/[^\n]*/g, '');
  };

  it('builds the rotation as a real R(a), reading mat2 as COLUMNS', () => {
    // GLSL's mat2 constructor fills columns, so mat2(c0r0, c0r1, c1r0, c1r1) is the
    // matrix [[c0r0, c1r0], [c0r1, c1r1]]. Written as mat2(cos, -sin, sin, cos) -- which
    // reads like R(a) laid out in rows -- it is actually R(-a), and the shader rotated
    // the ribbons the wrong way for the whole of this branch. R(a) as columns is
    // mat2(cos(a), sin(a), -sin(a), cos(a)): the MINUS belongs on the third argument.
    const args = frag().match(/mat2\(([^)]*\)[^)]*\)[^)]*\)[^)]*\))\s*\)/);
    expect(args, 'no mat2 rotation literal found -- update this guard').not.toBeNull();
    const parts = args[1].split(',').map((s) => s.trim());
    expect(parts, 'the rotation is no longer four scalar arguments').toHaveLength(4);
    expect(parts[0]).toMatch(/^cos\(/);
    expect(parts[1], 'column 0 row 1 must be +sin(a); a minus here makes this R(-a)')
      .toMatch(/^sin\(/);
    expect(parts[2], 'column 1 row 0 must be -sin(a); no minus here makes this R(-a)')
      .toMatch(/^-\s*sin\(/);
    expect(parts[3]).toMatch(/^cos\(/);
  });

  it('combines the ribbons without a sum that has to be clamped back down', () => {
    // The bands used to be three `band +=` terms weighted 1, 0.7 and 0.5, summing to as
    // much as 2.2 before a single clamp(band, 0.0, 1.0). Every region where two bands
    // overlapped flattened onto a plateau of unmixed u_mid, which is most of what made
    // the frame read as violet with black gaps instead of black with ribbons. max()
    // cannot exceed the largest single gain, so there is no plateau and no clamp.
    const source = frag();
    expect(source, 'the ribbons are summed again; a sum of weighted bands exceeds 1 ' +
      'wherever two overlap and flattens onto a plateau').not.toMatch(/band\s*\+=/);
    expect(source, 'a clamp on the combined band is the symptom of a sum that can ' +
      'exceed 1 -- fix the combination, not the overflow').not.toMatch(/clamp\s*\(\s*band/);
  });
});

/* ---------------------------------------------------------------------------
 * scripts/check-shader.html -- the GPU-side check the unit suite cannot be.
 * ------------------------------------------------------------------------- */

describe('the shader bench', () => {
  const bench = () => read('../scripts/check-shader.html');

  it('exists, because the suite cannot tell valid GLSL from broken', () => {
    expect(existsSync(new URL('../scripts/check-shader.html', import.meta.url))).toBe(true);
  });

  it('imports the real shader instead of copying it', () => {
    // Two throwaway versions of this page pasted the GLSL in, which makes it a check on
    // a snapshot rather than on the file -- it would happily report OK for a shader the
    // app no longer uses. The import is the entire point of committing it.
    expect(bench()).toMatch(/import\s*\{[^}]*FRAGMENT_SHADER[^}]*\}\s*from\s*['"][^'"]*src\/gradient\/shader\.js['"]/);
    expect(bench(), 'the bench has a copy of the GLSL pasted into it again')
      .not.toMatch(/void\s+main\s*\(\s*\)/);
  });

  it('measures the frame cost against a zero-render control', () => {
    // A previous measurement on this branch reported 0.0002 ms/frame and was measuring
    // the cost of queueing a draw call. A control pass with no drawArrays is what tells
    // those apart, and subtracting it is what makes the number mean anything.
    expect(bench()).toMatch(/controlIsNegligible/);
    expect(bench()).toMatch(/body\(false\)/);
  });

  it('stays out of the build', () => {
    // Vite's only entry is index.html; nothing may pull scripts/ into dist/.
    expect(read('../index.html')).not.toMatch(/check-shader/);
    expect(read('../vite.config.js')).not.toMatch(/rollupOptions|input/);
  });
});

/* ---------------------------------------------------------------------------
 * The nav's pill row.
 * ------------------------------------------------------------------------- */

describe('the nav pill row', () => {
  it('is not a scroll container, which is what clipped the pills', () => {
    // Measured on the live page at 1440, where the row fits with room to spare and
    // nothing needs to scroll: `overflow: auto hidden` on this row made it a scroll
    // container, and a scroll container clips everything painted outside its padding
    // box. The gap between the first pill's border box and the clip box was 0px on all
    // four sides, so every pill lost its 2px --stage ring top and bottom, the first and
    // last lost theirs on the outside edge, and the 7px :focus-visible ring was clipped
    // on every pill on every side.
    //
    // Asserting the absence of `overflow` rather than of `overflow: hidden` on purpose:
    // `auto`, `scroll` and `clip` all establish the same clip box, so banning one value
    // would leave the defect one keystroke away.
    const css = read('../src/styles/base.css').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const { selector, body } of leafRules(css)) {
      if (!selector.split(',').some((s) => s.trim() === '.site-nav-links')) continue;
      expect(body, '.site-nav-links declares overflow again -- that clips the pills\' ' +
        'rings and their focus rings. Make the bar fit instead.')
        .not.toMatch(/overflow(-x|-y)?\s*:/);
    }
  });

  it('lets the bar wrap rather than cut, as the safety net', () => {
    const css = read('../src/styles/base.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const nav = css.match(/(?:^|\n)\.site-nav\s*\{[^}]*\}/);
    expect(nav, 'the .site-nav rule is gone').not.toBeNull();
    expect(nav[0], 'a width nobody tested should push the call to action onto a second ' +
      'line, not off the screen').toMatch(/flex-wrap:\s*wrap/);
  });
});

/* ---------------------------------------------------------------------------
 * The story panel's material.
 * ------------------------------------------------------------------------- */

describe('the story panel', () => {
  it('is violet-tinted glass, not the clear glass every other glass panel gets', () => {
    // The client's call, made after the spec: violet identity kept, gradient still
    // moving behind it. Clear glass loses the identity; an opaque --accent sheet (what
    // it was two revisions ago) loses the gradient and needs near-black ink that no
    // longer suits a ground that moves. This asserts it has its own fill AND that the
    // fill is not simply the shared glass token under another name.
    const css = read('../src/styles/sections.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = css.match(/\[data-panel='story'\]\[data-surface='glass'\]\s*\{([^}]*)\}/);
    expect(rule, 'the story panel has no material of its own any more').not.toBeNull();
    const background = rule[1].match(/background:\s*var\((--[\w-]+)\)/);
    expect(background, 'the story panel no longer sets its own background').not.toBeNull();
    expect(background[1], 'the story panel is back on the shared glass token, so it is ' +
      'not tinted at all').not.toBe('--glass');

    // and the token it does use has to actually be violet: more blue than red, more red
    // than green, which is the same shape palette.test.js pins for the gradient's mid.
    const base = read('../src/styles/base.css');
    const token = base.match(new RegExp(`${background[1]}:\\s*rgba?\\(([^)]*)\\)`));
    expect(token, `${background[1]} is not declared as an rgba() token`).not.toBeNull();
    const [r, g, b] = token[1].split(',').map((v) => parseFloat(v));
    expect(b, 'the story tint is not violet').toBeGreaterThan(r);
    expect(r, 'the story tint is not violet').toBeGreaterThan(g);
  });
});
