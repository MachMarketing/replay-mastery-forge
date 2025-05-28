
import { ParsedReplayData } from './replayParser/types';
import { parseReplayNative } from './nativeReplayParser';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting parse with native parser');
  console.log('[replayParser] File details:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // Use native parser only
  try {
    console.log('[replayParser] Attempting native parsing...');
    const result = await parseReplayNative(file);
    console.log('[replayParser] Native parsing successful');
    return result;
  } catch (nativeError) {
    console.error('[replayParser] Native parsing failed:', nativeError);
    throw new Error(`Parsing fehlgeschlagen: ${nativeError instanceof Error ? nativeError.message : 'Unbekannter Fehler'}`);
  }
}
