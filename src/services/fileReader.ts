
/**
 * File reading utilities for StarCraft replay parser
 */

/**
 * Reads a File object into a Uint8Array
 */
export async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  console.log('Reading file as Uint8Array:', file.name);
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  console.log('File read successfully, size:', data.length);
  return data;
}
