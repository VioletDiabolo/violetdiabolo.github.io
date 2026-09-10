// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { supportsWebGL, prefersReducedMotion } from '../src/fallback/detect.js';

describe('detect', () => {
  it('reports no WebGL when context creation returns null', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(supportsWebGL()).toBe(false);
    vi.restoreAllMocks();
  });

  it('reports no WebGL when context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('blocked'); });
    expect(supportsWebGL()).toBe(false);
    vi.restoreAllMocks();
  });

  it('reads the reduced-motion media query', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('treats a missing matchMedia as no preference rather than crashing', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
    vi.unstubAllGlobals();
  });
});
