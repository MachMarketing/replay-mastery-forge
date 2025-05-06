
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
// import { componentTagger } from 'lovable-tagger'; // Auskommentieren, falls nicht benötigt
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';
// import wasm from '@rollup/plugin-wasm'; // Auskommentieren, falls WASM/screp-js nicht mehr genutzt wird

export default defineConfig(({ command }: ConfigEnv) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    // process.env.NODE_ENV !== 'production' && componentTagger(), // Auskommentieren, falls nicht benötigt
    // wasm({ // Auskommentieren, falls WASM/screp-js nicht mehr genutzt wird
    //   targetEnv: 'auto',
    //   maxFileSize: 10000000,
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // --- Node.js Polyfills für Browser ---
      'process': 'rollup-plugin-node-polyfills/polyfills/process-es6',
      'stream': 'stream-browserify',
      'events': 'rollup-plugin-node-polyfills/polyfills/events',
      'util': 'rollup-plugin-node-polyfills/polyfills/util',
      'buffer': 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
      'zlib': 'browserify-zlib',
      // ------------------------------------
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
        // Globale Node.js Variablen polyfillen
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }) as any,
      ],
    },
    // JSSUH und seine Abhängigkeiten in die Optimierung einschließen
    include: ['jssuh', 'buffer', 'stream-browserify', 'events', 'util', 'browserify-zlib'],
  },
  build: {
    rollupOptions: {
      plugins: [
        rollupNodePolyFill() as any,
      ],
      output: {
        format: 'es',
        manualChunks: {
          vendor: ['jssuh', 'buffer', 'stream-browserify', 'events', 'util', 'browserify-zlib']
        }
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },
}));
