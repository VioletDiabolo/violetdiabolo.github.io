// tests/pages.test.js
//
// The four page files, and the three places that have to agree about them: the nav's
// PAGES (where the buttons point), vite.config.js's inputs (what gets built), and the
// renderers (what each page draws). Each of those can be edited without the others, and
// each mismatch fails somewhere different -- a 404 in production, a page that boots as
// the home page, a fix made to one <head> and missed in three.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { PAGES } from '../src/ui/nav.js';
import { RENDERERS } from '../src/ui/sections.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const fileOf = (href) => href.replace(/^\.\//, '');

describe('the page files', () => {
  it('exist for every page the nav links to, each naming its own page', () => {
    for (const [page, href] of Object.entries(PAGES)) {
      const file = fileOf(href);
      expect(existsSync(new URL(`../${file}`, import.meta.url)), `${file} is missing`).toBe(true);
      const dataPage = /<body data-page="([^"]+)">/.exec(read(`../${file}`));
      expect(dataPage, `${file} has no <body data-page>`).not.toBeNull();
      expect(dataPage[1], `${file} boots as "${dataPage[1]}", not "${page}"`).toBe(page);
      expect(RENDERERS, `nothing renders data-page="${page}"`).toHaveProperty(page);
    }
  });

  it('are identical but for the title, the description and the page they name', () => {
    // One <head>, four copies. A font, a stylesheet or a meta tag changed in one of them
    // and not the others is a page that quietly looks or behaves differently.
    const normalise = (html) => html
      .replace(/<title>[^<]*<\/title>/, '<title></title>')
      .replace(/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="" />')
      .replace(/<body data-page="[^"]+">/, '<body data-page="">');
    const [first, ...rest] = Object.values(PAGES).map((href) => [fileOf(href), read(`../${fileOf(href)}`)]);
    for (const [file, html] of rest) {
      expect(normalise(html), `${file} differs from ${first[0]} beyond its title, description and data-page`)
        .toBe(normalise(first[1]));
    }
    // And the three things that DO differ, differ: two pages sharing a title would be two
    // browser tabs nobody could tell apart.
    const titles = Object.values(PAGES).map((href) => /<title>([^<]*)<\/title>/.exec(read(`../${fileOf(href)}`))[1]);
    expect(new Set(titles).size, `titles repeat: ${titles.join(' | ')}`).toBe(titles.length);
  });
});

describe('the build', () => {
  it('lists every page as an entry, and nothing else', () => {
    // Vite builds index.html alone unless told otherwise. A page left out of the inputs
    // works perfectly in dev and 404s in production -- the worst shape a bug can take.
    const config = read('../vite.config.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const input = /input\s*:\s*\{([^}]*)\}/.exec(config);
    expect(input, 'vite.config.js declares no rollupOptions.input object').not.toBeNull();
    const entries = [...input[1].matchAll(/['"]([^'"]+\.html)['"]/g)].map((m) => m[1]).sort();
    expect(entries).toEqual(Object.values(PAGES).map(fileOf).sort());
  });
});
