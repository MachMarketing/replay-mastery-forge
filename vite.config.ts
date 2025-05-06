
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-node-polyfills';

// Define proper module format type
export default defineConfig(({ command }: ConfigEnv) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Node.js polyfills for browser environments
      'process': 'rollup-plugin-node-polyfills/polyfills/process-es6',
      'stream': 'stream-browserify',
      'events': 'rollup-plugin-node-polyfills/polyfills/events',
      'util': 'util/', // Fix: Use the correct path for util
      'buffer': 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
      'zlib': 'browserify-zlib',
      'path': 'rollup-plugin-node-polyfills/polyfills/path',
      'querystring': 'rollup-plugin-node-polyfills/polyfills/querystring',
      // Add any other Node.js builtins that JSSUH might need
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
        // Polyfill global Node.js variables
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }) as any,
      ],
    },
    // Include JSSUH and its dependencies in the optimization
    include: [
      'jssuh', 
      'buffer', 
      'stream-browserify', 
      'events', 
      'util', 
      'browserify-zlib',
      'process'
    ],
  },
  build: {
    rollupOptions: {
      plugins: [
        nodePolyfills() as any,
      ],
      output: {
        // Fix: Use proper type for format
        format: 'es' as const, // Use const assertion to make TypeScript happy
        manualChunks: {
          vendor: [
            'jssuh', 
            'buffer', 
            'stream-browserify', 
            'events', 
            'util', 
            'browserify-zlib'
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
