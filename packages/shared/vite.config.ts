import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'test-utils': resolve(__dirname, 'src/test-utils.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['runtypes', 'vitest'],
    },
  },
});

