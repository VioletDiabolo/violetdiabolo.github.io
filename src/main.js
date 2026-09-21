import { buildNav } from './ui/nav.js';
import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';
import { createGradient } from './gradient/gradient.js';
import { createLifecycle } from './render/lifecycle.js';
import { createFrameCap, renderSize } from './render/budget.js';
import { createSmoothScroll } from './scroll/smooth.js';

export const APP_NAME = 'violet-diabolo';

function boot() {
  const content = document.getElementById('content');
  renderSections(content);
  document.body.prepend(buildNav());
  // Mounted before any graphics branch: content must never wait on WebGL.
  initReveal();

  if (!supportsWebGL()) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }

  const canvas = document.getElementById('gradient');
  const gradient = createGradient({ canvas });
  if (!gradient) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }

  const fit = () => {
    const { width, height } = renderSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    gradient.resize(width, height);
  };
  fit();

  if (prefersReducedMotion()) {
    // One frame, repainted after every resize instead of scheduled just once.
    // gradient.resize() reassigns canvas.width/height, which clears the WebGL drawing
    // buffer as a side effect; with no lifecycle running to draw a next frame, reusing
    // the animated path's bare `fit` listener here would leave the canvas permanently
    // transparent after the first resize (a mobile orientation change fires one). This
    // handler is self-contained instead -- it re-fits AND re-renders -- and it only
    // ever runs synchronously in direct response to the browser's own resize event:
    // not a lifecycle, not a rAF loop, not a timer. Nothing is scheduled here that the
    // browser didn't already schedule by firing the event.
    const paintAfterResize = () => {
      fit();
      gradient.render(0);
    };
    gradient.render(0);
    window.addEventListener('resize', paintAfterResize);
    return;
  }

  window.addEventListener('resize', fit);

  const smooth = createSmoothScroll({
    reduced: false, // this branch is already past the reduced-motion return
    onVelocity: (v) => gradient.setVelocity(v),
  });

  const cap = createFrameCap();
  const lifecycle = createLifecycle({
    element: canvas,
    onFrame: (delta) => {
      // Lenis is driven every frame, ahead of the cap below: the cap throttles only the
      // gradient's draw call, and stepping Lenis at that same reduced rate would make the
      // inertia stutter.
      if (smooth) smooth.raf(performance.now());
      const elapsed = cap(delta);
      if (elapsed > 0) gradient.render(elapsed);
    },
  });
  lifecycle.start();

  window.__vd = { ...(window.__vd ?? {}), gradient, lifecycle, smooth };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
