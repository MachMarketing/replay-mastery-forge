
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'

// Initialize buffer polyfills immediately
import { ensureBufferPolyfills } from '@/services/nativeReplayParser/bufferUtils'

// Setup polyfills for Node.js modules in browser
ensureBufferPolyfills();

// Ensure process.nextTick is available for jssuh
if (typeof window !== 'undefined' && typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Add process.nextTick polyfill if it's missing
if (typeof process !== 'undefined' && !process.nextTick) {
  process.nextTick = (fn: Function, ...args: any[]) => {
    setTimeout(() => fn(...args), 0);
  };
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <App />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
