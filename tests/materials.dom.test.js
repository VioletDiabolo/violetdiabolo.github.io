// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { SRGBColorSpace } from 'three';
import { GRADIENT_STOPS, createGradientTexture } from '../src/diabolo/materials.js';

describe('cup gradient', () => {
  it('runs neck to rim across the full range', () => {
    expect(GRADIENT_STOPS[0].offset).toBe(0);
    expect(GRADIENT_STOPS.at(-1).offset).toBe(1);
  });

  it('keeps stops in ascending order', () => {
    const offsets = GRADIENT_STOPS.map((s) => s.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('uses valid hex colours throughout', () => {
    for (const s of GRADIENT_STOPS) expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lightens monotonically toward the rim', () => {
    const lum = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722;
    };
    const values = GRADIENT_STOPS.map((s) => lum(s.color));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });
});

describe('gradient texture', () => {
  it('runs bottom-to-top so violet lands on the neck, not the rim', () => {
    const calls = { axis: null, stops: [] };
    const fakeCtx = {
      fillStyle: null,
      createLinearGradient(...axis) {
        calls.axis = axis;
        return { addColorStop(offset, color) { calls.stops.push([offset, color]); } };
      },
      fillRect() {},
    };
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
    const texture = createGradientTexture();
    spy.mockRestore();

    // Bottom (y = height) to top (y = 0). Reversing this inverts the cup.
    expect(calls.axis).toEqual([0, 256, 0, 0]);
    expect(calls.stops[0]).toEqual([0, '#4c1d95']);
    expect(calls.stops.at(-1)).toEqual([1, '#d9bdf7']);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
  });
});
