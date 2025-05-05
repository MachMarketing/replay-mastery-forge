
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
      nodePolyfills({
        // Minimum polyfills needed for browser compatibility
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Whether to polyfill specific modules
        protocolImports: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        stream: 'stream-browserify',
        path: 'path-browserify',
      },
    },
    server: {
      port: 8080,
      host: "::",
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
      include: ['buffer', 'screp-js'],
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
