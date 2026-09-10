# Real-condition verification record

Recorded 2026-09-10 against `build/scroll-explosion`, build `npm run build` → `vite preview`,
driven in a real Chromium instance. **Only observed numbers appear here.** Where the
environment could not produce a condition, that is stated rather than papered over.

## Summary

| Claim | Status |
|---|---|
| Render loop stops when the document is hidden | **Verified, real condition** |
| Render loop stops when the stage is scrolled offscreen | **Unreachable by design** — `#stage` is sticky and full-height, so it is always onscreen; see §2 |
| anime.js global engine is never paused by us | **Verified** by construction + test guard |
| Explosion timeline drives all 7 parts and is reversible | **Verified** by direct timeline seek |
| Scroll position drives the timeline | **Verified structurally**; live tick delivery **not verified** |
| Diabolo silhouette and palette | **Verified** by framebuffer readback |
| Content readable without the 3D system | **Verified** structurally |

## 1. Hidden document — real condition, genuinely observed

The preview pane reports `document.hidden === true` and delivers **zero** animation frames.
This is a real hidden document, not a dispatched `visibilitychange` event.

```
document.hidden        : true
lifecycle.isRunning()  : false
lifecycle.frameCount() : 0        (still 0 after 1200 ms)
```

The render loop correctly refused to start. This satisfies the non-negotiable directly:
the frame was never scheduled, rather than scheduled-and-skipped.

Independent attribution probe, same page:

```
plain scroll listener  : 0 events fired   (window.scrollY really changed 0 → 3000)
bare requestAnimationFrame loop : 0 ticks in 900 ms
```

Both zero. So the absence of frames is attributable to the host, and the lifecycle's own
`isRunning() === false` is what demonstrates our behaviour.

## 2. Scrolled offscreen — unreachable by design, not merely unverified

This branch is not just unverified in this environment; it is **unreachable by design in
any browser**. `#stage` is `position: sticky; top: 0; height: 100dvh` and is a sibling of
`#content` inside `body` (index.html), so it stays pinned to the viewport for the entire
document height. There is no scroll position at which it leaves the viewport, so its
`IntersectionObserver` reports `isIntersecting: true` from first paint and **can never flip
to `false`**. §5's own measurements prove this directly: `#stage` top/bottom sits at
`0 / 768` at scrollY 0, 3760, **and** 6752 — the last of those is the end of the document,
and the box has not moved at all.

This environment also happens to fire no `scroll` events (measured above: 0 events across a
real 3000 px scroll), but that is incidental — even a host that delivered perfect scroll
events could not exercise this branch, because this layout never presents the observer with
anything to react to.

Practically, this means `document.hidden` (§1) is the only pause gate that ever actually
fires for this page as built. The IntersectionObserver wiring in `src/diabolo/lifecycle.js`
is defensive depth — correct, and worth keeping for a future layout that does let the stage
scroll offscreen — rather than a path this particular layout can trigger. No amount of
re-running this probe against a real browser would change that answer, so there is nothing
to gain from a human scrolling the built site to check it.

The pause/resume logic itself — independent of whether this layout ever drives it — is
covered by the 13 tests in `tests/lifecycle.test.js`, which exercise the branch through an
injected `observerFactory` standing in for `IntersectionObserver` rather than a real one.

## 3. anime.js global engine

Never paused by this codebase. `engine.pauseOnDocumentHidden` already defaults to `true`
and the engine self-idles (`paused: true`, `reqId: 0`) with no active children — measured
under Node during planning. Pausing it by hand would freeze visible content animations that
share it. `tests/lifecycle.test.js` fails if `src/diabolo/lifecycle.js` ever imports `animejs`
(negative-controlled: adding the import turns the suite red).

## 4. Explosion timeline — verified by direct seek

`timeline.duration === 666`. Re-measured after the hero hold and reassembly beat were
added. Seeking drives a correct staggered cascade and resolves:

| t | state |
|---|---|
| 0 | all seven parts at HOME (assembled) |
| 60 | **still exactly HOME** — the hero hold, so the object is seen whole before anything detaches |
| 333 | mid-explosion: `cupTop` y 2.42, `gasketTop` 1.73, `hubConeTop` 0.75, bearing leaving |
| 666 | **exact HOME again** — the footer beat snaps it back together |

Verified programmatically: `heroHolds: true`, `explodesMidway: true`, `reassembles: true`
(end state compared field-by-field against the assembled state). This is spec success
criterion 1 — assembled → exploded → reassembled — met within a single forward pass, not
only by scrolling back up.

## 5. Scroll → timeline wiring — structurally verified

The ScrollObserver's resolved bounds map 1:1 onto the page's scroll range:

```
offsetStart : 0
offsetEnd   : 6752
distance    : 6752
maxScroll   : 6752     (document.body.scrollHeight - innerHeight)
progress    : 0 → 0.25 → 0.50 → 0.75 → 1.00 across the page
```

**Labelled synthetic:** because the host delivers no rAF, anime's tickers never ran, so the
observer never resolved `_params.target` into `target` on its own. The resolution and
`refresh()` were driven by hand to obtain the numbers above. `_params.target` was confirmed
to be `<main#content>` — the wiring is correct; only tick delivery was substituted.

An earlier run of this same probe reported `offsetStart: -3000`. That was an artifact of a
stale `container.scrollY` left by a previous probe, not a defect; re-running from a clean
reload gave the correct `0`. Recorded because a reader might otherwise repeat it.

### Why the scroll target is `#content` and not `#stage`

`#stage` is `position: sticky`, so its rect never travels:

| scrollY | #stage top/bottom | #content top/bottom |
|---|---|---|
| 0 | 0 / 768 | 0 / 7520 |
| 3760 | **0 / 768** | −3760 / 3760 |
| 6752 | **0 / 768** | −6751 / 768 |

A ScrollObserver derives progress from target travel, so a sticky target sits at progress 0
forever — the explosion silently never ran. `createChoreography` now throws if handed a
sticky or fixed target (`tests/choreography.dom.test.js`).

## 6. Diabolo appearance — framebuffer readback

Measured over non-transparent pixels of the rendered canvas:

| | before palette pass | after |
|---|---|---|
| mean RGB | (198, 183, 209) | **(155, 119, 198)** |
| clearly violet | 41 % | **83.2 %** |

One frame: 9 draw calls, 30,624 triangles, 19 % canvas coverage. ASCII readback of the
framebuffer confirms the silhouette — wide rims, narrow waist, dark axle.

Seam continuity after the hub-cone fix: bearing seam 0.0135, gasket seam 0.0112
(was 0.0515 / 0.0538 with the cone mounted inverted).

## 7. Content and responsiveness

```
sections            : hero, about, events, media, board, contact, footer
footer              : "VIOLET DIABOLO 2026" — year computed via getFullYear(), not hardcoded
photographs         : all 4 pipeline bases referenced in the DOM (group-usadc, usadc-wide, aaron, jon)
responsive images   : 4 <picture> elements, 4 AVIF + 4 WebP sources, 0 <img> without alt
board               : 3 cards, 1 placeholder (no <img>), 5 semesters, defaults to Fall 2025
media               : 10 facades, 0 live iframes before activation
forms               : 2 facades
outbound links      : 6, all resolving to the club's real destinations
horizontal overflow : none
fonts               : Space Grotesk + Space Mono both confirmed loaded
```

Mobile (375 × 812) screenshotted: display type legible over the canvas via a scrim, tagline
in mono, single column. Desktop hero screenshotted: translucent violet diabolo with cyan
gaskets, black hubs and chrome bearing over a graph-paper ground.

**Not verified:** section screenshots below the fold — the pane will not recomposite the
sticky WebGL canvas after a scroll jump. Those sections were verified structurally via the
DOM instead, and the numbers above are from that.

## 8. Bundle

```
dist/index.html   3.66 kB │ gzip   1.46 kB
dist/assets/*.css 9.33 kB │ gzip   2.80 kB
dist/assets/*.js  603 kB  │ gzip 158.41 kB
largest image     307 kB  (from an 11.3 MB master; 240 kB AVIF is what actually serves)
```

## Outstanding for a human on a real machine

1. Watch the explosion scrub live end to end (§5).
2. Toggle OS reduced-motion and confirm `data-stage="static"` looks deliberate.
3. Disable WebGL and confirm `data-stage="unsupported"` shows the static SVG diabolo.

(Scrolling the stage offscreen is deliberately not listed here — §2 explains why this
layout makes that impossible to observe, so there would be nothing to see.)
