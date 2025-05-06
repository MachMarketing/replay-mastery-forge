
/**
 * Browser detection and feature testing utilities
 */

// Storage key for browser WASM issues
const BROWSER_WASM_ISSUES_KEY = 'browser_has_wasm_issues';

/**
 * Mark the current browser as having WASM issues
 */
export function markBrowserAsHavingWasmIssues(): void {
  try {
    localStorage.setItem(BROWSER_WASM_ISSUES_KEY, 'true');
    console.warn('[browserDetection] Browser marked as having WASM issues');
  } catch (e) {
    console.error('[browserDetection] Error marking browser as having WASM issues:', e);
  }
}

/**
 * Check if the current browser has known WASM issues
 */
export function hasBrowserWasmIssues(): boolean {
  try {
    return localStorage.getItem(BROWSER_WASM_ISSUES_KEY) === 'true';
  } catch (e) {
    console.error('[browserDetection] Error checking browser WASM issues status:', e);
    return false;
  }
}

/**
 * Clear the browser WASM issues flag
 */
export function clearBrowserWasmIssuesFlag(): void {
  try {
    localStorage.removeItem(BROWSER_WASM_ISSUES_KEY);
    console.log('[browserDetection] Browser WASM issues flag cleared');
  } catch (e) {
    console.error('[browserDetection] Error clearing browser WASM issues flag:', e);
  }
}
