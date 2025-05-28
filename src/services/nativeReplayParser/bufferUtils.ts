
/**
 * Buffer utilities for browser-compatible replay parsing
 * Handles conversion between different buffer types for screp-js compatibility
 */

/**
 * Convert ArrayBuffer to Node.js Buffer for screp-js compatibility
 */
export function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
  // Check if Buffer is available (should be polyfilled)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arrayBuffer);
  }
  
  // Fallback: create a Buffer-like object
  const uint8Array = new Uint8Array(arrayBuffer);
  const bufferLike = Object.create(Buffer.prototype);
  Object.assign(bufferLike, uint8Array);
  return bufferLike;
}

/**
 * Convert File to Buffer for screp-js
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return arrayBufferToBuffer(arrayBuffer);
}

/**
 * Ensure Buffer polyfills are available
 */
export function ensureBufferPolyfills(): boolean {
  if (typeof Buffer === 'undefined') {
    console.warn('[BufferUtils] Buffer polyfill not available');
    return false;
  }
  
  if (typeof process === 'undefined') {
    // Create minimal process object for screp-js
    (globalThis as any).process = {
      env: {},
      version: 'v16.0.0',
      platform: 'browser'
    };
  }
  
  return true;
}

/**
 * Safe buffer allocation with fallbacks
 */
export function safeBufferAlloc(size: number): Buffer {
  try {
    return Buffer.alloc(size);
  } catch (error) {
    console.warn('[BufferUtils] Buffer.alloc failed, using fallback');
    return Buffer.from(new ArrayBuffer(size));
  }
}

/**
 * Convert any buffer-like object to Uint8Array
 */
export function toUint8Array(data: any): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  
  if (data && typeof data.length === 'number') {
    return new Uint8Array(data);
  }
  
  throw new Error('Cannot convert to Uint8Array');
}
