
/**
 * File reading utilities for StarCraft replay parser
 */

/**
 * Reads a File object into a Uint8Array
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  console.log('📊 [fileReader] Reading file as Uint8Array:', file.name);
  
  // Grundlegende Validierung
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (file.size === 0) {
    throw new Error('File is empty (0 bytes)');
  }
  
  try {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Validiere, dass wir tatsächlich Daten haben
    if (!data || data.length === 0) {
      throw new Error('File could not be read properly (0 bytes in buffer)');
    }
    
    console.log('📊 [fileReader] File read successfully, size:', data.length);
    
    // Ausgabe der ersten Bytes zur Diagnose (nur die ersten 16 Bytes)
    const headerBytes = Array.from(data.slice(0, 16))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`📊 [fileReader] File header: ${headerBytes}`);
    
    return data;
  } catch (error) {
    console.error('❌ [fileReader] Error reading file:', error);
    throw new Error('Failed to read file: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Create a browser-compatible mock File object from a Uint8Array
 * Useful for testing in environments where File is not available
 */
export function createMockFileFromUint8Array(data: Uint8Array, fileName: string = 'test.rep'): File {
  return new File([data], fileName, { type: 'application/octet-stream' });
}
