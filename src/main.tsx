
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill for WebAssembly compatibility
if (typeof globalThis.WebAssembly === 'undefined') {
  console.warn('WebAssembly is not supported in this browser. Some features may not work.');
}

// Polyfill setTimeout/clearTimeout globally if needed (should not normally be necessary, but just in case)
if (typeof globalThis.setTimeout === 'undefined' && typeof setTimeout === 'function') {
  (globalThis as any).setTimeout = setTimeout;
  console.log('Polyfilled global.setTimeout');
}

if (typeof globalThis.clearTimeout === 'undefined' && typeof clearTimeout === 'function') {
  (globalThis as any).clearTimeout = clearTimeout;
  console.log('Polyfilled global.clearTimeout');
}

// Provide global window access to Buffer for WebAssembly modules that need it
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Make sure process is defined globally with a properly implemented nextTick
if (typeof globalThis.process === 'undefined') {
  console.log('Polyfilling global.process');
  (globalThis as any).process = {
    env: {},
    browser: true,
    nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0),
  };
} else {
  // Make sure process.env exists
  if (!(globalThis as any).process.env) {
    (globalThis as any).process.env = {};
  }
  // Ensure nextTick is available and properly implemented
  if (typeof (globalThis as any).process.nextTick !== 'function') {
    (globalThis as any).process.nextTick = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
    console.log('Polyfilled global.process.nextTick');
  }
}

// Also make it available on window for libraries that expect it there
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = (globalThis as any).process;
  console.log('Mirrored process to window.process');
}

// Make sure there's an element with id "root" in the DOM
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div id="root"></div>';
}

// Create root with error handling
try {
  createRoot(document.getElementById("root")!).render(<App />);
  console.log("✅ Application successfully mounted");
} catch (e) {
  console.error("❌ Failed to render application:", e);
}
