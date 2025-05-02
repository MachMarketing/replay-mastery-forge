
/**
 * Helper functions for reading files
 */

/**
 * Reads a file and returns its contents as a Uint8Array
 * with improved error handling and validation
 */
export function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Check for valid file
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Check for empty file
    if (file.size === 0) {
      reject(new Error('File is empty (0 bytes)'));
      return;
    }
    
    // Create file reader with timeout protection
    const reader = new FileReader();
    
    // Set up a timeout to prevent hanging reads
    const timeoutMs = 30000; // 30 seconds timeout
    const timeout = setTimeout(() => {
      reader.abort();
      reject(new Error(`File read timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    reader.onload = () => {
      clearTimeout(timeout);
      
      if (!reader.result) {
        reject(new Error('File reader returned empty result'));
        return;
      }
      
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Validation check
        if (uint8Array.length === 0) {
          reject(new Error('File read successfully but content is empty'));
          return;
        }
        
        console.log(`📊 [fileReader] Successfully read file: ${file.name}, size: ${uint8Array.length} bytes`);
        resolve(uint8Array);
      } catch (error) {
        reject(new Error(`Error converting file to Uint8Array: ${error}`));
      }
    };
    
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Error reading file: ${reader.error?.message || 'unknown error'}`));
    };
    
    reader.onabort = () => {
      clearTimeout(timeout);
      reject(new Error('File reading was aborted'));
    };
    
    try {
      console.log(`📊 [fileReader] Starting to read file: ${file.name}, size: ${file.size} bytes`);
      reader.readAsArrayBuffer(file);
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Error initiating file read: ${error}`));
    }
  });
}
