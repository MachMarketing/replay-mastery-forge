
/**
 * Utility to detect browser compatibility issues with WASM
 */

// Flag to track if we've detected WASM issues in this browser
let hasDetectedWasmIssues = false;

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
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for older browsers or problematic WebKit versions
    const isOldBrowser = 
      /msie|trident/.test(userAgent) || // IE
      /edge\/[0-17]\./.test(userAgent) || // Old Edge
      /version\/(11|10|9|8).*safari/.test(userAgent); // Older Safari
      
    // Check if we're in a context where WebAssembly might be restricted
    const hasWebAssembly = typeof WebAssembly === 'object' && 
                         typeof WebAssembly.instantiate === 'function';
                         
    // Mark as having issues if any check fails
    hasDetectedWasmIssues = isOldBrowser || !hasWebAssembly;
    
    return hasDetectedWasmIssues;
  } catch (e) {
    // If we can't run detection, assume there are issues
    console.warn('[browserDetection] Error during detection, assuming WASM issues:', e);
    hasDetectedWasmIssues = true;
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
    sessionStorage.setItem('has_wasm_issues', 'true');
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Check if the browser has been marked as having WASM issues
 */
export function hasBrowserWasmIssues(): boolean {
  // Check sessionStorage first
  try {
    if (sessionStorage.getItem('has_wasm_issues') === 'true') {
      hasDetectedWasmIssues = true;
    }
  } catch (e) {
    // Ignore storage errors
  }
  
  return hasDetectedWasmIssues;
}
