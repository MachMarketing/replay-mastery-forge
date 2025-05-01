
/**
 * File reading utilities for StarCraft replay parser
 */

/**
 * Reads a File object into a Uint8Array
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  console.log('📊 [fileReader] Reading file as Uint8Array:', file.name);
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (file.size === 0) {
    throw new Error('File is empty (0 bytes)');
  }
  
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (!event.target || !event.target.result) {
          return reject(new Error('Failed to read file: FileReader did not provide result'));
        }
        
        // Convert to Uint8Array
        let data: Uint8Array;
        
        if (event.target.result instanceof ArrayBuffer) {
          data = new Uint8Array(event.target.result);
        } else {
          // For text results
          const text = String(event.target.result);
          data = new TextEncoder().encode(text);
        }
        
        console.log('📊 [fileReader] File read successfully, size:', data.length);
        resolve(data);
      };
      
      reader.onerror = (event) => {
        console.error('❌ [fileReader] Error reading file:', reader.error);
        reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown error')));
      };
      
      // Read as ArrayBuffer for binary files
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('❌ [fileReader] Error in readFileAsUint8Array:', error);
    throw new Error('Failed to read file: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Create a browser-compatible File object from a Uint8Array
 * Useful for testing in environments where File is not available
 */
export function createMockFileFromUint8Array(data: Uint8Array, fileName: string = 'test.rep'): File {
  return new File([data], fileName, { type: 'application/octet-stream' });
}
