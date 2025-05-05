
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import wasm from '@rollup/plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      wasm(),
      nodePolyfills({
        // Whether to polyfill specific globals
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Whether to polyfill specific modules
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        stream: 'stream-browserify',
        path: 'path-browserify',
      },
    },
    server: {
      port: 8080,
      proxy: {
        // Proxy API requests to the SCREP service
        '/api/parse': {
          target: env.SCREP_API_URL || 'http://localhost:8000/parse',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/parse/, ''),
        }
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
    build: {
      rollupOptions: {
        plugins: [wasm()],
      },
    },
  };
});
