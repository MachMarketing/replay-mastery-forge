
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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
    }
  };
});
