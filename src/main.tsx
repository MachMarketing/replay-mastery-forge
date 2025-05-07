
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from "react-router-dom";
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Explicit polyfill for process.nextTick
if (typeof window !== 'undefined') {
  if (typeof window.process === 'undefined') {
    // Use 'as any' to bypass TypeScript's strict type checking
    // This is acceptable as we're just creating a minimal polyfill
    (window as any).process = { 
      env: {},
      nextTick: function(callback: Function, ...args: any[]) {
        setTimeout(() => callback(...args), 0);
      }
    };
    console.log('✅ Explicit process.nextTick polyfill applied in main.tsx');
  } else if (typeof window.process.nextTick !== 'function') {
    // Add nextTick if process exists but nextTick doesn't
    window.process.nextTick = function(callback: Function, ...args: any[]) {
      setTimeout(() => callback(...args), 0);
    };
    console.log('✅ Added process.nextTick to existing process object');
  }
}

// Log environment details to help debugging
console.log('Environment info:');
console.log('- process exists:', typeof process !== 'undefined');
console.log('- process.env exists:', typeof process !== 'undefined' && typeof process.env !== 'undefined');
console.log('- process.nextTick exists:', typeof process !== 'undefined' && typeof process.nextTick === 'function');
console.log('- window.process exists:', typeof window !== 'undefined' && typeof window.process !== 'undefined');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Log successful render
console.log('✅ App successfully rendered');
