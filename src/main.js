import { buildNav } from './ui/nav.js';
import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';
import { createGradient } from './gradient/gradient.js';
import { createLifecycle } from './render/lifecycle.js';
import { createFrameCap, renderSize } from './render/budget.js';

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
  window.addEventListener('resize', fit);

  if (prefersReducedMotion()) {
    // Exactly one frame. No lifecycle, so nothing is ever scheduled again.
    gradient.render(0);
    return;
  }

  const cap = createFrameCap();
  const lifecycle = createLifecycle({
    element: canvas,
    onFrame: (delta) => {
      const elapsed = cap(delta);
      if (elapsed > 0) gradient.render(elapsed);
    },
  });
  lifecycle.start();

  window.__vd = { ...(window.__vd ?? {}), gradient, lifecycle };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
