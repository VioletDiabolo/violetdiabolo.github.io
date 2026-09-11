import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { createStage, resolveQualityTier, readSignals } from './diabolo/stage.js';
import { createLabels } from './diabolo/labels.js';
import { createLifecycle } from './diabolo/lifecycle.js';
import { createChoreography } from './scroll/choreography.js';
import { createEntrance } from './scroll/entrance.js';
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
  // Registered after construction, not inside createStage: labels need stage.parts,
  // and the stage needs the labels as an overlay — constructor-time wiring would be
  // circular. See stage.js's addOverlay for the seam this uses.
  const labels = createLabels({
    parts: stage.parts,
    tilt: stage.tilt,
    container: document.getElementById('label-layer'),
    state: stage.state,
  });
  stage.addOverlay(labels);
  window.addEventListener('resize', stage.resize);

  const reducedMotion = prefersReducedMotion();
  document.documentElement.dataset.stage = reducedMotion ? 'static' : 'live';

  // Exposed for external verification tooling.
  window.__vd = { stage, lifecycle: null, choreography: null, entrance: null };

  const attachScroll = () => {
    // Created here, not earlier: the entrance and the scroll timeline both write part
    // positions, and two live timelines on one property fight.
    // #content, not #stage: the stage is position:sticky and its rect never travels,
    // so a ScrollObserver watching it would sit at progress 0 forever.
    window.__vd.choreography = createChoreography({
      parts: stage.parts,
      tilt: stage.tilt,
      state: stage.state,
      camera: stage.camera,
      scrollTarget: content,
    });
  };

  const entrance = createEntrance({
    parts: stage.parts,
    tilt: stage.tilt,
    camera: stage.camera,
    // Under reduced motion nothing drives a repaint, so attaching the scroll timeline
    // would mutate part positions against a canvas that never redraws — the scene data
    // and the pixels would diverge. Assembled and face-on is the whole experience.
    onComplete: reducedMotion ? () => {} : attachScroll,
  });
  window.__vd.entrance = entrance;

  if (reducedMotion) {
    // No lifecycle: its render loop applies a continuous idle spin every frame purely
    // from elapsed time (diabolo/stage.js's rotationDeltas), with no user input driving
    // it. That is exactly the autoplaying motion reduced-motion users must not get.
    // entrance.skip() resolves the object to its assembled, face-on state with no scroll
    // timeline attached (see onComplete above), so nothing ever mutates it again. A
    // single manual render paints that resolved frame.
    entrance.skip();
    stage.render(0);
  } else {
    window.__vd.lifecycle = createLifecycle({ element: stageEl, onFrame: stage.render });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
