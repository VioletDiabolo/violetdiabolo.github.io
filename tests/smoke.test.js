import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/main.js';

describe('toolchain', () => {
  it('resolves the app entry module', () => {
    expect(APP_NAME).toBe('violet-diabolo');
  });
});
