
/**
 * Buffer utilities for browser-compatible replay parsing
 * Handles conversion between different buffer types for screp-js compatibility
 */

/**
 * Convert ArrayBuffer to Node.js Buffer for screp-js compatibility
 */
export function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
  // Check if Buffer is available (should be polyfilled)
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return Buffer.from(arrayBuffer);
  }
  
  // Fallback: create a Buffer-like object with polyfill
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Create a Buffer-like object that should work with screp-js
  const bufferLike = Object.assign(uint8Array, {
    constructor: Buffer,
    // Add Buffer methods that screp-js might need
    toString(encoding?: string) {
      if (encoding === 'hex') {
        return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      return new TextDecoder().decode(this);
    },
    slice(start?: number, end?: number) {
      return this.subarray(start, end);
    }
  });
  
  return bufferLike as unknown as Buffer;
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
  // Check if global Buffer is available
  if (typeof globalThis.Buffer === 'undefined') {
    console.warn('[BufferUtils] Buffer polyfill not available, creating minimal implementation');
    
    // Create minimal Buffer implementation
    globalThis.Buffer = {
      from: (data: any) => {
        if (data instanceof ArrayBuffer) {
          return new Uint8Array(data);
        }
        if (typeof data === 'string') {
          return new TextEncoder().encode(data);
        }
        return new Uint8Array(data);
      },
      alloc: (size: number) => new Uint8Array(size),
      isBuffer: (obj: any) => obj instanceof Uint8Array
    } as any;
  }
  
  // Ensure process object exists for screp-js
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {
      env: {},
      version: 'v16.0.0',
      platform: 'browser',
      nextTick: (fn: Function) => setTimeout(fn, 0)
    } as any;
  }
  
  return true;
}

/**
 * Safe buffer allocation with fallbacks
 */
export function safeBufferAlloc(size: number): Buffer {
  try {
    if (typeof Buffer !== 'undefined' && Buffer.alloc) {
      return Buffer.alloc(size);
    }
    return arrayBufferToBuffer(new ArrayBuffer(size));
  } catch (error) {
    console.warn('[BufferUtils] Buffer.alloc failed, using fallback');
    return arrayBufferToBuffer(new ArrayBuffer(size));
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
  
  if (data && typeof data.length === 'number') {
    return new Uint8Array(data);
  }
  
  throw new Error('Cannot convert to Uint8Array');
}
