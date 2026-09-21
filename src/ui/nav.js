import { SITE } from '../content/index.js';

/** Where the pills go, ordered as the page is. */
export const NAV_LINKS = Object.freeze([
  { label: 'About', target: 'about' },
  { label: 'Events', target: 'events' },
  { label: 'Media', target: 'media' },
  { label: 'Board', target: 'board' },
]);

/** The one filled control. A club page's job is to get people to turn up. */
export const CTA = Object.freeze({ label: 'Join us', target: 'contact' });

export function buildNav() {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Sections');

  const wordmark = document.createElement('a');
  wordmark.className = 'site-nav-mark';
  wordmark.href = '#hero';
  wordmark.textContent = SITE.name;
  nav.append(wordmark);

  const pills = document.createElement('div');
  pills.className = 'site-nav-links';
  for (const link of NAV_LINKS) {
    const a = document.createElement('a');
    a.href = `#${link.target}`;
    a.textContent = link.label;
    pills.append(a);
  }
  nav.append(pills);

  const cta = document.createElement('a');
  cta.className = 'site-nav-cta';
  cta.dataset.cta = 'true';
  cta.href = `#${CTA.target}`;
  cta.textContent = CTA.label;
  nav.append(cta);

  return nav;
}
