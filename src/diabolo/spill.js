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
      element.style.setProperty('--spill-x', `${(projected.x * 0.5 + 0.5) * 100}%`);
      element.style.setProperty('--spill-y', `${(-projected.y * 0.5 + 0.5) * 100}%`);
    },
    setSize() {},
    dispose() {
      element.remove();
    },
  };
}
