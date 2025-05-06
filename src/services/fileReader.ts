
/**
 * Helper utility for file creation and reading
 */

/**
 * Create a File object from a Uint8Array
 */
export function createMockFileFromUint8Array(data: Uint8Array, filename = 'test.rep'): File {
  // In browsers, we need to use a Blob to create a File
  const blob = new Blob([data]);
  return new File([blob], filename, { type: 'application/octet-stream' });
}

/**
 * Read a File as a Uint8Array
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
      reject(reader.error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}
