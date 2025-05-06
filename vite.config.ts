
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
      // Fix polyfill paths to use browser-compatible versions directly
      'process': 'process',
      'stream': 'stream-browserify',
      'events': 'events',
      'util': 'util',
      'buffer': 'buffer',
      'zlib': 'browserify-zlib',
      'path': 'path-browserify',
      'querystring': 'querystring-es3',
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
      'jssuh', 
      'buffer', 
      'stream-browserify', 
      'events', 
      'util',
      'browserify-zlib',
      'path-browserify',
      'querystring-es3',
      'process',
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
            'jssuh', 
            'buffer', 
            'stream-browserify', 
            'events', 
            'util',
            'browserify-zlib',
            'path-browserify',
            'querystring-es3',
            'process',
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
