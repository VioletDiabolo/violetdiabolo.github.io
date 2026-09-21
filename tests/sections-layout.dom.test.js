// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSections } from '../src/ui/sections.js';
import { buildNav } from '../src/ui/nav.js';

// A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom environment,
// Vitest's global URL shim resolves relative file: URLs against http://localhost:3000
// instead of the filesystem, which breaks fs.readFileSync(url) (see the identical
// workaround in tests/ui.dom.test.js's "content boundary" test).
const SECTIONS_CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');

describe('the grid panel title size', () => {
  it("is not swallowed by the shared title-size rule (dead-by-specificity guard)", () => {
    // The historical bug: `.section:not([data-section='hero']):not([data-panel='story'])
    // h2` was meant to size every panel's h2 except hero (its own h1, elsewhere) and story
    // (its own h2, above it in the file), trusting the grid panel's OWN rule just below it
    // to win for grid by coming later in the file. It never could: :not() takes the
    // specificity of its own argument, so that selector was (0,3,1) against the grid
    // rule's (0,1,1), and the LESS specific grid rule lost on font-size regardless of
    // source order -- media, board and contact rendered at up to 68px (--type-title's
    // ceiling) inside a label column of at most 208px. Fixed by naming the one panel the
    // shared rule is actually for ([data-panel='feature'] h2) instead of trying to
    // out-rank a selector it was never meant to compete with.
    //
    // Checked with the real selector engine (Element.matches), not hand-rolled
    // specificity arithmetic -- hand-rolled arithmetic is exactly what produced the bug.
    // Whatever rule currently sets --type-title on a panel's h2 must not ALSO match a
    // grid panel's h2, independent of which one the cascade would pick if it did.
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
      <section class="section" data-section="media" data-panel="grid">
        <div class="room"><div class="room-head"><h2>Media</h2></div></div>
      </section>`;
    const h2 = document.querySelector('h2');
    const leaking = rules
      .flatMap((rule) => rule[1].trim().split(',').map((s) => s.trim()))
      .filter((s) => h2.matches(s));
    expect(leaking, "a rule setting --type-title also matches a grid panel's h2").toEqual([]);
  });

  it('gives the grid panel its own, smaller h2 rule, so the guard above has something to protect', () => {
    // Without this, the test above would pass just as well if the grid rule were ever
    // deleted outright rather than merely shadowed -- "no shared rule matches" is not the
    // same claim as "the grid panel is sized correctly", and this is what tells them apart.
    const css = readFileSync(SECTIONS_CSS, 'utf8');
    expect(css).toMatch(/\[data-panel='grid'\]\s*h2\s*\{[^}]*font-size:\s*clamp\(/);
  });
});

/* ---------------------------------------------------------------------------
 * Nothing sticks to the viewport.
 *
 * This is the task's own binding constraint ("no position: sticky anywhere"), and this
 * file used to guard it with exactly this cascade-resolution machinery -- aimed at the
 * 3D object's mobile band, which held media/board/contact's headings out of sight behind
 * an opaque #stage. The band and the object are both gone (this branch strips them), so
 * the machinery is recovered here (from git history at 15901a9^, "the object's band on a
 * phone") asking a simpler question than it used to: does ANYTHING on the real rendered
 * page, at phone width, resolve to position: sticky at all, whoever declares it.
 *
 * A source-text grep for the literal string (what briefly stood in for this guard) can't
 * answer that safely in either direction. It fails on the phrase merely appearing in a
 * comment -- this branch's own report records exactly that happening, and the "Measures"
 * comment above the removed --label-col token in base.css tripped it again while writing
 * this fix, unprompted. And nothing stops it passing on a rule that reaches sticky
 * through formatting the regex doesn't expect (a custom property, unusual whitespace)
 * while something on the page really is stuck. This instead renders the real page --
 * every room plus the real nav, exactly as main.js assembles them -- and resolves the
 * winning declaration with the real selector engine (Element.matches) plus explicit
 * specificity arithmetic: the same technique the dead-by-specificity guard above this
 * one already uses, so a rule that is merely SHADOWED cannot false-positive here either.
 * ------------------------------------------------------------------------- */

// Plain paths, not `new URL(..., import.meta.url)` -- see the comment on SECTIONS_CSS
// above; the same jsdom gotcha applies here.
const STYLESHEETS = ['base.css', 'sections.css'].map((f) => ({
  name: f,
  css: readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/', f), 'utf8'),
}));

/** Media conditions this guard knows how to evaluate for a 375px-wide phone. */
const NARROW_CONDITIONS = new Map([
  ['(max-width: 767px)', true],
  // Declares nothing positional, and true for a visitor who has not asked for less
  // motion -- which is the case this guard is about.
  ['(prefers-reduced-motion: no-preference)', true],
]);

/**
 * Every leaf declaration block in source order, each tagged with the at-rule condition it
 * sits under (null at the top level). One level of nesting is all these files use.
 */
function leafRulesWithMedia(css, sheet) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const scan = (source, condition) => {
    let i = 0;
    while (i < source.length) {
      const brace = source.indexOf('{', i);
      if (brace === -1) break;
      const prelude = source.slice(i, brace).trim();
      let depth = 1;
      let j = brace + 1;
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
        j++;
      }
      const body = source.slice(brace + 1, j - 1);
      if (body.includes('{')) scan(body, prelude.replace(/^@media\s*/, ''));
      else rules.push({ sheet, condition, selector: prelude, body });
      i = j;
    }
  };
  scan(stripped, null);
  return rules;
}

/**
 * (a, b, c) for ONE compound/complex selector -- ids, then classes+attributes+
 * pseudo-classes, then types+pseudo-elements. Throws on anything whose specificity is not
 * this simple count, rather than returning a number that merely looks plausible: :not()
 * taking its own argument's specificity is precisely the trap that shipped the
 * --type-title defect the guard above this one protects against.
 */
function specificity(selector) {
  if (/:(?:not|is|where|has|nth-[\w-]+)\(/i.test(selector)) {
    throw new Error(
      `specificity(): "${selector}" uses a functional pseudo-class whose specificity is ` +
      `not a plain token count. Extend this helper rather than trusting the count.`);
  }
  let s = ` ${selector} `;
  const take = (re) => { const n = (s.match(re) || []).length; s = s.replace(re, ' '); return n; };
  const attributes = take(/\[[^\]]*\]/g);
  const pseudoElements = take(/::[\w-]+/g);
  const pseudoClasses = take(/:[\w-]+/g);
  const ids = take(/#[\w-]+/g);
  const classes = take(/\.[\w-]+/g);
  const types = take(/[a-zA-Z][\w-]*/g);
  return [ids, classes + attributes + pseudoClasses, types + pseudoElements];
}

const beats = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];

/**
 * The winning declaration of `property` on `element` at phone width, by the real cascade:
 * every rule in effect below 768px whose selector actually matches, ranked by specificity
 * and then by source order. Returns null when nothing sets it.
 */
function winningDeclaration(element, property, rules) {
  let best = null;
  rules.forEach((rule, order) => {
    if (rule.condition !== null && !NARROW_CONDITIONS.get(rule.condition)) return;
    const declaration = rule.body
      .split(';')
      .map((d) => d.trim())
      .filter((d) => new RegExp(`^${property}\\s*:`).test(d))
      .pop();
    if (!declaration) return;
    if (/!important/.test(declaration)) {
      throw new Error(`winningDeclaration(): "${declaration}" is !important, which this ` +
        `guard does not rank. Extend it rather than letting it mis-rank.`);
    }
    const value = declaration.slice(declaration.indexOf(':') + 1).trim();
    for (const one of rule.selector.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!element.matches(one)) continue;
      const spec = specificity(one);
      if (!best || !beats(best.spec, spec)) best = { spec, order, value, rule, selector: one };
    }
  });
  return best;
}

describe('nothing sticks to the viewport', () => {
  it('resolves no element to position: sticky at phone width', () => {
    const rules = STYLESHEETS.flatMap((s) => leafRulesWithMedia(s.css, s.name));

    // Any condition this guard was not built to evaluate makes every answer below an
    // under-approximation, so it fails here rather than passing on partial knowledge.
    for (const rule of rules) {
      if (rule.condition === null) continue;
      expect(
        NARROW_CONDITIONS.has(rule.condition),
        `${rule.sheet} has an @media (${rule.condition}) this guard cannot evaluate -- ` +
        `add it to NARROW_CONDITIONS with the value it takes on a 375px phone`,
      ).toBe(true);
    }

    // The real page: every room's real markup plus the real nav, in the same order
    // main.js assembles them (document.body.prepend(buildNav()) after renderSections) --
    // not that any selector in these two files depends on sibling order (checked: no `+`
    // or `~` combinator appears in either), but matching it exactly leaves no doubt.
    const root = document.createElement('main');
    renderSections(root);
    document.body.replaceChildren(buildNav(), root);

    const stuck = [];
    for (const element of document.body.querySelectorAll('*')) {
      const position = winningDeclaration(element, 'position', rules);
      if (position?.value !== 'sticky') continue;
      const where = element.className || element.tagName.toLowerCase();
      const section = element.closest('[data-section]')?.dataset.section ?? 'n/a';
      stuck.push(
        `.${where} in [data-section=${section}] resolves to position: sticky via ` +
        `"${position.selector}" (${position.rule.sheet}` +
        `${position.rule.condition ? ` @media ${position.rule.condition}` : ''})`);
    }
    expect(stuck, stuck.join('\n')).toEqual([]);
  });
});
