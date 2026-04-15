import { describe, it, expect } from 'vitest';
import { App } from '../App.js';

describe('dashboard package smoke test', () => {
  it('should export App component as defined', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});

