
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';
import wasm from '@rollup/plugin-wasm';

export default defineConfig(({ command }: ConfigEnv) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    process.env.NODE_ENV !== 'production' && componentTagger(),
    wasm({
      // Explicitly specify that we want to load WASM files as URL
      targetEnv: 'auto', 
      maxFileSize: 10000000, // Allow for large WASM files (10MB)
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      stream: 'stream-browserify',
      events: 'rollup-plugin-node-polyfills/polyfills/events',
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true, process: true }) as any],
    },
    exclude: ['screp-js'], // Explicitly tell Vite not to pre-bundle screp-js
  },
  build: {
    rollupOptions: {
      plugins: [rollupNodePolyFill() as any],
    },
  },
}));
