
/**
 * File reading utilities for binary and text processing
 */

/**
 * Read a file as Uint8Array for binary processing
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error || new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read a file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error || new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Read file as data URL (for images, etc)
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error || new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
}
