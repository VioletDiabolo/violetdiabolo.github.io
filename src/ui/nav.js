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

/**
 * Publish the bar's REAL height as --nav-offset, for everything that has to clear it.
 *
 * .site-nav is `position: fixed`, so nothing in the flow knows it is there and five
 * offsets in the stylesheets clear it by hand: the hero, story and feature
 * `padding-block` tops, the hero's own narrow-screen override, and [data-section]'s
 * `scroll-margin-top`. All of them used to read --nav-h -- a fixed `clamp()` -- and a
 * fixed clamp cannot know that the bar has WRAPPED.
 *
 * Measured at 375x812 with a 32px root font (a user at 200% text zoom): the bar wraps to
 * three rows and stands 188.8px tall against a --nav-h of 104px, while the hero h1 sat
 * at y 112. The fixed bar, at z-index 3, painted over the club's own name by 76.8px, and
 * every jump link landed its heading underneath the bar for the same reason. The comment
 * in base.css that justified `flex-wrap: wrap` cited 200% text zoom as the case it
 * handled; 200% text zoom was the case it broke.
 *
 * So the height is measured rather than assumed. A ResizeObserver rather than a `resize`
 * listener, because the bar's height changes on things `resize` never fires for -- a
 * text-zoom change, a webfont swapping in and re-measuring the pills, a label growing --
 * and because it needs no teardown bookkeeping in main.js, which has none to add it to.
 *
 * No feedback loop: --nav-offset feeds panel padding and scroll-margin, never anything
 * the bar's own height depends on, so writing it cannot resize the thing being observed.
 *
 * Writes nothing while the height is 0 (jsdom has no layout, and a 0px offset would be
 * worse than the CSS fallback), and disconnects itself once the bar leaves the document.
 *
 * @returns {() => void} a disposer, for a caller that ever needs to tear the nav down.
 */
export function observeNavHeight(nav, root = document.documentElement) {
  const stop = () => {
    // Back to the CSS fallback (--nav-offset: var(--nav-h)) rather than to a stale px.
    root.style.removeProperty('--nav-offset');
  };
  if (typeof ResizeObserver !== 'function') return stop;
  const observer = new ResizeObserver(() => {
    if (!nav.isConnected) {
      observer.disconnect();
      stop();
      return;
    }
    const { height } = nav.getBoundingClientRect();
    if (height > 0) root.style.setProperty('--nav-offset', `${height}px`);
  });
  observer.observe(nav);
  return () => { observer.disconnect(); stop(); };
}

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

  // Measured here rather than in main.js: the mount there is one line
  // (`document.body.prepend(buildNav())`) and the bar's height is the bar's business.
  observeNavHeight(nav);

  return nav;
}
