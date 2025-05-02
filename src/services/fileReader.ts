
/**
 * Utility functions for file reading operations
 */

/**
 * Read a file as Uint8Array asynchronously
 * @param file The file to read
 * @returns Promise that resolves with the file contents as Uint8Array
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Validate the file
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    if (file.size === 0) {
      reject(new Error('File is empty'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        reject(new Error('Failed to read file: No result available'));
        return;
      }
      
      try {
        // Convert ArrayBuffer to Uint8Array
        const arrayBuffer = event.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      } catch (error) {
        reject(new Error(`Error processing file data: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = (event) => {
      reject(new Error(`Error reading file: ${event.target?.error?.message || 'Unknown error'}`));
    };
    
    // Start reading the file as ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Creates a mock File object from a Uint8Array
 * Used for testing the parser with simulated data
 * 
 * @param data The Uint8Array data to create a file from
 * @param fileName The name of the file
 * @param options Additional file options
 * @returns A File object
 */
export function createMockFileFromUint8Array(
  data: Uint8Array,
  fileName: string = 'test.rep',
  options?: FilePropertyBag
): File {
  const defaultOptions: FilePropertyBag = {
    type: 'application/octet-stream',
    ...options
  };
  
  try {
    // Create the File object
    return new File([data], fileName, defaultOptions);
  } catch (error) {
    console.error('Error creating File from Uint8Array:', error);
    // Fallback for environments where File constructor is not fully supported
    return new File([data.buffer], fileName, defaultOptions);
  }
}
