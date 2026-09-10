import { Group, LatheGeometry, Mesh } from 'three';
import { PART_IDS, DIMS, cupProfile, gasketProfile, hubConeProfile, bearingProfile } from './profiles.js';

const halfBearing = DIMS.bearingHeight / 2;
const gasketY = halfBearing + DIMS.hubHeight;
const neckY = gasketY + DIMS.gasketThickness;

/**
 * Assembled rest positions. `flip: true` mirrors the part through the XZ plane,
 * which is how the bottom half is built from the same profiles as the top.
 */
export const HOME = Object.freeze({
  cupTop: { y: neckY, flip: false },
  gasketTop: { y: gasketY, flip: false },
  hubConeTop: { y: halfBearing, flip: false },
  axleBearing: { y: 0, flip: false },
  hubConeBottom: { y: -halfBearing, flip: true },
  gasketBottom: { y: -gasketY, flip: true },
  cupBottom: { y: -neckY, flip: true },
});

const PROFILE_FOR = {
  cupTop: (seg) => cupProfile(seg),
  cupBottom: (seg) => cupProfile(seg),
  gasketTop: () => gasketProfile(),
  gasketBottom: () => gasketProfile(),
  hubConeTop: () => hubConeProfile(),
  hubConeBottom: () => hubConeProfile(),
  axleBearing: () => bearingProfile(),
};

const MATERIAL_FOR = {
  cupTop: 'cup', cupBottom: 'cup',
  gasketTop: 'gasket', gasketBottom: 'gasket',
  hubConeTop: 'hub', hubConeBottom: 'hub',
  axleBearing: 'bearing',
};

export function buildDiabolo({ materials, segments = 96 }) {
  const root = new Group();
  root.name = 'diaboloRoot';
  const parts = {};

  for (const id of PART_IDS) {
    const group = new Group();
    group.name = id;
    group.userData.partId = id;

    const radialSegments = Math.max(24, Math.round(segments * 0.75));
    const geometry = new LatheGeometry(PROFILE_FOR[id](segments), radialSegments);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, materials[MATERIAL_FOR[id]]);

    if (HOME[id].flip) mesh.scale.y = -1;

    // The bearing spins on its own axis. anime.js writes `group`; the render loop
    // writes `spinMesh`. Separate objects keeps one owner per transform.
    if (id === 'axleBearing') {
      mesh.position.y = -halfBearing;
      group.userData.spinMesh = mesh;
    }

    group.add(mesh);
    group.position.y = HOME[id].y;
    root.add(group);
    parts[id] = group;
  }

  return { root, parts };
}
