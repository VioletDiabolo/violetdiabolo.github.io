import { buildNav } from './ui/nav.js';
import { renderSections } from './ui/sections.js';
import { applySectionSides } from './ui/layout.js';
import { initReveal } from './ui/reveal.js';
import { createStage, resolveQualityTier, readSignals } from './diabolo/stage.js';
import { createLabels } from './diabolo/labels.js';
import { createLifecycle } from './diabolo/lifecycle.js';
import { createChoreography, PROFILE_X, HERO_ID } from './scroll/choreography.js';
import { createEntrance } from './scroll/entrance.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';

export const APP_NAME = 'violet-diabolo';

function boot() {
  const content = document.getElementById('content');
  document.body.prepend(buildNav());
  renderSections(content);
  applySectionSides(content);
  // Mounted unconditionally, before the WebGL branch below, so every section fades
  // into place the same way regardless of stage state (live, static, or unsupported).
  initReveal();

  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('renderer');

  if (!supportsWebGL()) {
    document.documentElement.dataset.stage = 'unsupported';
    // The same re-stamp the reduced-motion branch below does, and for the same reason
    // one step further on: there is no object travelling through the rooms here either.
    // stage.css swaps the canvas for a hand-built SVG of the same diabolo, pinned dead
    // centre by `inset: 0; margin: auto` for the whole document -- ONE object position,
    // so one correct reading side, exactly the case `staticAt` exists for.
    //
    // Left unstamped, media/board/contact kept the grid room's own 'center' and spread
    // their cards across the full width, over a fallback the page has no way to fade or
    // move: measured at 1440x900, the card column ran x 352-1368 against an SVG box at
    // x 549-891, and the object's own drawn ink at 583-857 sat inside it. It also left
    // media's 165vh hold-back in force -- 1485px of blank column held back for a fade
    // that never happens -- because that rule is scoped to [data-side='center'] and so
    // stops applying the moment this call stamps 'left'. Both halves, one line.
    //
    // HERO_ID rather than a literal 'hero': the same constant the reduced-motion branch
    // and the choreography's own table use, so the three cannot drift apart.
    applySectionSides(content, { staticAt: HERO_ID });
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
    // Re-stamped for the static object below. The call in boot()'s opening lines gives
    // each section its own room's side, which is right only while the object travels
    // through those rooms. Here it never does: entrance.skip() parks it at the hero
    // room's position, at full opacity, and no scroll timeline is ever attached, so one
    // object position has to serve every section. Without this the media section keeps
    // the grid room's centred column and reads straight through an object that is
    // sitting, permanently and undimmed, where the hero left it.
    applySectionSides(content, { staticAt: HERO_ID });
    // No lifecycle: its render loop applies a continuous idle spin every frame purely
    // from elapsed time (diabolo/stage.js's rotationDeltas), with no user input driving
    // it. That is exactly the autoplaying motion reduced-motion users must not get.
    // entrance.skip() resolves the object to its assembled, face-on state with no scroll
    // timeline attached (see onComplete above), so nothing ever mutates it again.
    entrance.skip();
    // A static face-on view hides the labels and shows the parts stacked inside each
    // other. Profile with labels visible is the readable still of the same diagram.
    stage.tilt.rotation.x = PROFILE_X;
    stage.state.labelOpacity = 1;
    stage.render(0);
  } else {
    window.__vd.lifecycle = createLifecycle({ element: stageEl, onFrame: stage.render });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
