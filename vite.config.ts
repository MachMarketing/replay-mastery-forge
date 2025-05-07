
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { componentTagger } from "lovable-tagger";

// Define proper module format type
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      globals: {
        Buffer: true, 
        global: true,
        process: true,
      },
    }),
    mode === 'development' && componentTagger(),
    {
      name: 'explicit-process-nextTick-polyfill',
      transform(code, id) {
        // Add explicit polyfill for process.nextTick at the top of main.tsx
        if (id.includes('main.tsx')) {
          const polyfill = `
// Explicit polyfill for process.nextTick
if (typeof window !== 'undefined') {
  if (typeof window.process === 'undefined') {
    window.process = { env: {} };
  }
  if (typeof window.process.nextTick !== 'function') {
    window.process.nextTick = function(callback, ...args) {
      setTimeout(() => callback(...args), 0);
    };
    console.log('✅ Explicit process.nextTick polyfill applied');
  }
}
`;
          return polyfill + code;
        }
        return null;
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Explicit aliases for Node.js built-ins
      stream: 'stream-browserify',
      process: 'process/browser',
      zlib: 'browserify-zlib',
      util: 'util',
      path: 'path-browserify',
      buffer: 'buffer',
    },
  },
  define: {
    // Define process.env for compatibility
    'process.env': {},
    'global': 'globalThis',
    // Ensure nextTick is available
    'process.nextTick': 'function(cb) { setTimeout(cb, 0); }',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }) as any,
      ],
    },
    // Include JSSUH and its dependencies in the optimization
    include: ['jssuh', 'stream-browserify', 'process/browser', 'events'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },
}));
