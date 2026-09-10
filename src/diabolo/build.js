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
  cupTop: Object.freeze({ y: neckY, flip: false }),
  gasketTop: Object.freeze({ y: gasketY, flip: false }),
  hubConeTop: Object.freeze({ y: halfBearing, flip: false }),
  axleBearing: Object.freeze({ y: 0, flip: false }),
  hubConeBottom: Object.freeze({ y: -halfBearing, flip: true }),
  gasketBottom: Object.freeze({ y: -gasketY, flip: true }),
  cupBottom: Object.freeze({ y: -neckY, flip: true }),
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

  const radialSegments = Math.max(24, Math.round(segments * 0.75));

  for (const id of PART_IDS) {
    const group = new Group();
    group.name = id;
    group.userData.partId = id;

    const geometry = new LatheGeometry(PROFILE_FOR[id](segments), radialSegments);
    // LatheGeometry derives normals analytically from the profile tangent. Do not call
    // computeVertexNormals() here: it yields (0,0,0) at the bearing's on-axis pole seam.
    const mesh = new Mesh(geometry, materials[MATERIAL_FOR[id]]);

    // Negatively-scaled meshes get their front-face winding test flipped automatically by
    // three.js (determinantAffine() < 0), so no manual normal compensation is needed here.
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
