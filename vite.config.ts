
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
      transform(code: string, id: string) {
        // Only apply to main.tsx
        if (id.includes('main.tsx')) {
          return null; // Skip as we've already added the polyfill directly in main.tsx
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
    // Include native parser dependencies in the optimization
    include: ['react', 'react-dom', 'stream-browserify', 'process/browser', 'events', 'util'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    rollupOptions: {
      // Bundle native parser dependencies
      output: {
        manualChunks: {
          'parser-core': ['stream-browserify', 'pako'],
          'react-vendor': ['react', 'react-dom'],
        }
      }
    },
  },
}));
