import { describe, it, expect } from 'vitest';
import { createServer } from '../index.js';

describe('api package smoke test', () => {
  it('should export createServer as a function', () => {
    expect(createServer).toBeDefined();
    expect(typeof createServer).toBe('function');
  });
});

