import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { createStage, resolveQualityTier, readSignals } from './diabolo/stage.js';
import { createLifecycle } from './diabolo/lifecycle.js';
import { createChoreography } from './scroll/choreography.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';

export const APP_NAME = 'violet-diabolo';

function boot() {
  const content = document.getElementById('content');
  renderSections(content);
  // Mounted unconditionally, before the WebGL branch below, so every section fades
  // into place the same way regardless of stage state (live, static, or unsupported).
  initReveal();

  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('renderer');

  if (!supportsWebGL()) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }

  const tier = resolveQualityTier(readSignals());
  const stage = createStage({ canvas, tier });
  window.addEventListener('resize', stage.resize);

  if (prefersReducedMotion()) {
    document.documentElement.dataset.stage = 'static';
    stage.render(0);
    return;
  }

  document.documentElement.dataset.stage = 'live';
  // #content, not #stage: the stage is position:sticky and its rect never travels,
  // so a ScrollObserver watching it would sit at progress 0 forever.
  const choreography = createChoreography({ parts: stage.parts, state: stage.state, scrollTarget: content });
  const lifecycle = createLifecycle({ element: stageEl, onFrame: stage.render });

  // Exposed for the Task 12 verification probe.
  window.__vd = { stage, lifecycle, choreography };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
