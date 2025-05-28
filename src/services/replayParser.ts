
import { ParsedReplayData } from './replayParser/types';
import { parseReplayNative } from './nativeReplayParser';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] === EINFACHE DIREKTE PARSING ===');
  console.log('[replayParser] File:', file.name, 'Size:', file.size);
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // DIREKT und EINFACH: Nur noch native Parser mit screp-js
  try {
    console.log('[replayParser] Verwende direkten screp-js Parser...');
    const result = await parseReplayNative(file);
    console.log('[replayParser] === ERFOLG mit korrekten Daten ===');
    console.log('[replayParser] Spieler 1:', result.primaryPlayer.name);
    console.log('[replayParser] Spieler 2:', result.secondaryPlayer.name);
    return result;
  } catch (error) {
    console.error('[replayParser] Parsing failed:', error);
    throw new Error(`Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
