
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { componentTagger } from "lovable-tagger";

// Define proper module format type
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fix polyfill paths to use browser-compatible versions
      'process': 'rollup-plugin-node-polyfills/polyfills/process-es6',
      'stream': 'stream-browserify',
      'events': 'rollup-plugin-node-polyfills/polyfills/events',
      'util': 'rollup-plugin-node-polyfills/polyfills/util', 
      'buffer': 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
      'zlib': 'browserify-zlib',
      'path': 'rollup-plugin-node-polyfills/polyfills/path',
      'querystring': 'rollup-plugin-node-polyfills/polyfills/querystring',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.browser': 'true',
        'process.version': '"v16.0.0"',
        'process.versions': '{}',
        'process.platform': '"browser"',
      },
      plugins: [
        // Need to add 'as any' to avoid TypeScript errors with the plugin
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }) as any,
      ],
    },
    // Include JSSUH and its dependencies in the optimization
    include: [
      'process',
      'jssuh', 
      'buffer', 
      'stream-browserify', 
      'events', 
      'util', 
      'browserify-zlib',
      'rollup-plugin-node-polyfills/polyfills/process-es6',
    ],
  },
  build: {
    rollupOptions: {
      plugins: [
        // Need to add 'as any' to avoid TypeScript errors with the plugin
        nodePolyfills() as any,
      ],
      output: {
        format: 'es' as const,
        manualChunks: {
          vendor: [
            'process',
            'jssuh', 
            'buffer', 
            'stream-browserify', 
            'events', 
            'util', 
            'browserify-zlib',
            'rollup-plugin-node-polyfills/polyfills/process-es6',
          ]
        }
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },
}));
