
/**
 * Utility to detect browser compatibility issues with WASM
 * 
 * This helps identify environments where WASM parsing is likely to fail
 * and provides a way to remember problematic browsers.
 */

// Storage key for persistence
const WASM_ISSUES_STORAGE_KEY = 'has_wasm_issues';

// Flag to track if we've detected WASM issues in this browser
let hasDetectedWasmIssues = false;

// Extend the Performance interface for browsers (like Chrome) that support memory info
interface ExtendedPerformance extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

/**
 * Check if the current browser is likely to have issues with WASM
 * This is a heuristic based on common problematic configurations
 */
export function detectWasmCompatibilityIssues(): boolean {
  // If we've already detected issues, return that result
  if (hasDetectedWasmIssues) {
    return true;
  }
  
  try {
    // Check for stored flag first (from previous sessions)
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedValue = sessionStorage.getItem(WASM_ISSUES_STORAGE_KEY);
      if (storedValue === 'true') {
        hasDetectedWasmIssues = true;
        return true;
      }
    }
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for older browsers or problematic WebKit versions
    const isOldBrowser = 
      /msie|trident/.test(userAgent) || // IE
      /edge\/[0-17]\./.test(userAgent) || // Old Edge
      /version\/(11|10|9|8).*safari/.test(userAgent); // Older Safari
      
    // Check for mobile browsers which can have memory limitations
    const isMobileBrowser =
      /android/.test(userAgent) ||
      /iphone|ipad|ipod/.test(userAgent);
      
    // Check if we're in a context where WebAssembly might be restricted
    const hasWebAssembly = typeof WebAssembly === 'object' && 
                         typeof WebAssembly.instantiate === 'function';
    
    // Check for low memory conditions - only in browsers that support memory API
    const performance = window.performance as ExtendedPerformance;
    const hasLimitedMemory = 
      typeof performance !== 'undefined' && 
      performance.memory !== undefined && 
      performance.memory.jsHeapSizeLimit < 500000000; // ~500MB
                        
    // Mark as having issues if any check fails
    hasDetectedWasmIssues = isOldBrowser || !hasWebAssembly || (isMobileBrowser && hasLimitedMemory);
    
    // Remember the result
    if (hasDetectedWasmIssues) {
      markBrowserAsHavingWasmIssues();
    }
    
    return hasDetectedWasmIssues;
  } catch (e) {
    // If we can't run detection, assume there are issues
    console.warn('[browserDetection] Error during detection, assuming WASM issues:', e);
    hasDetectedWasmIssues = true;
    markBrowserAsHavingWasmIssues();
    return true;
  }
}

/**
 * Mark the browser as having WASM issues (used after runtime errors)
 */
export function markBrowserAsHavingWasmIssues(): void {
  hasDetectedWasmIssues = true;
  
  // Store this in sessionStorage to persist across page loads
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(WASM_ISSUES_STORAGE_KEY, 'true');
    }
  } catch (e) {
    // Ignore storage errors
    console.warn('[browserDetection] Could not store WASM issues flag:', e);
  }
}

/**
 * Check if the browser has been marked as having WASM issues
 */
export function hasBrowserWasmIssues(): boolean {
  // Run detection if we haven't already
  if (!hasDetectedWasmIssues) {
    detectWasmCompatibilityIssues();
  }
  
  return hasDetectedWasmIssues;
}
