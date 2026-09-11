import { Vector3 } from 'three';

/**
 * A soft bloom that tracks the object's projected screen position.
 *
 * This is the page's only connective tissue: the ground has nothing drawn on it, and the
 * relationship between object and layout is carried entirely by where the light falls.
 * Reads anime-owned transforms and writes nothing but two CSS custom properties, so it
 * introduces no new owner of anything.
 */
export function createSpill({ container, tilt, camera }) {
  const element = document.createElement('div');
  element.className = 'light-spill';
  element.style.pointerEvents = 'none';
  element.setAttribute('aria-hidden', 'true');
  container.append(element);

  const projected = new Vector3();

  return {
    element,
    render() {
      tilt.getWorldPosition(projected);
      projected.project(camera);
      // NDC is -1..1 with +Y up; CSS percentages are 0..100 with +Y down.
      // Vector3.project does not clamp: an object outside the frustum projects to NDC
      // beyond ±1, which would otherwise place the bloom outside the page. Clamp both
      // axes to the visible 0-100 range before writing them.
      const x = Math.min(100, Math.max(0, (projected.x * 0.5 + 0.5) * 100));
      const y = Math.min(100, Math.max(0, (-projected.y * 0.5 + 0.5) * 100));
      element.style.setProperty('--spill-x', `${x}%`);
      element.style.setProperty('--spill-y', `${y}%`);
    },
    setSize() {},
    dispose() {
      element.remove();
    },
  };
}
