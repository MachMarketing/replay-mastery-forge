
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

/**
 * Creates a File object from a Uint8Array for testing purposes
 * @param data The Uint8Array data to be converted to a File
 * @param fileName Optional name for the file (default: 'test.rep')
 * @param fileType Optional MIME type (default: 'application/octet-stream')
 * @returns A File object containing the provided data
 */
export function createMockFileFromUint8Array(
  data: Uint8Array,
  fileName: string = 'test.rep',
  fileType: string = 'application/octet-stream'
): File {
  try {
    // Create a Blob from the Uint8Array
    const blob = new Blob([data], { type: fileType });
    
    // Create a File from the Blob
    const file = new File([blob], fileName, { type: fileType });
    
    console.log(`📊 [fileReader] Created mock file: ${fileName}, size: ${file.size} bytes`);
    return file;
  } catch (error) {
    console.error(`❌ [fileReader] Error creating mock file: ${error}`);
    // Create an empty file as fallback
    return new File([], fileName, { type: fileType });
  }
}
