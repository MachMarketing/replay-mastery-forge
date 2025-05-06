import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { componentTagger } from 'lovable-tagger';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      // Configure node polyfills more extensively to support JSSUH
      nodePolyfills({
        // Fully polyfill Node.js global environment
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Whether to polyfill specific modules
        protocolImports: true,
        // Explicitly enable full process polyfill with nextTick
        exclude: [],
        // Overrides for specific polyfills
        overrides: {
          // Make sure process.nextTick is available
          process: true,
          events: true,
          stream: true,
          util: true,
          buffer: true,
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        stream: 'stream-browserify',
        path: 'path-browserify',
        process: 'process/browser',
        util: 'util',
      },
    },
    server: {
      port: 8080,
      host: "::",
      hmr: {
        // Ensure HMR works correctly with WebAssembly modules
        overlay: true,
      },
      proxy: {
        // Proxy API requests to the SCREP service
        '/api/parse': {
          target: env.SCREP_API_URL || 'http://localhost:8000/parse',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/parse/, ''),
        }
      },
      // Force the server to invalidate the module cache on restart
      force: true,
    },
    optimizeDeps: {
      // Force Vite to reoptimize dependencies on server restart
      force: true,
      include: ['buffer', 'screp-js', 'jssuh'],
      exclude: [], // Don't exclude WASM modules
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
          'process.env': JSON.stringify({}),
          // Convert boolean values to strings as required by the type
          'process.browser': 'true',
        },
        // Enable WASM support
        supported: {
          'wasm': true
        }
      },
    },
    build: {
      // Improve build settings for WASM support
      target: 'esnext',
      sourcemap: true,
      // Don't inline WASM files
      assetsInlineLimit: 0,
      // Clear the cache on each build
      emptyOutDir: true,
      // Use terser for better WASM compatibility
      minify: 'terser',
      terserOptions: {
        compress: {
          // Keep console.logs for debugging
          drop_console: false,
        },
      },
      rollupOptions: {
        // Ensure WASM is properly handled
        output: {
          manualChunks: {
            'screp-js': ['screp-js'],
            'jssuh': ['jssuh']
          }
        }
      }
    },
    // Use a completely fresh cache
    cacheDir: '.vite_fresh_cache_' + Date.now(),
  };
});
