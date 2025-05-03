
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

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
