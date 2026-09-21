import { buildNav } from './ui/nav.js';
import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';

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
  // Task 3 mounts the gradient here.
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
