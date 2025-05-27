
import { ParsedReplayData } from './replayParser/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting parse with Supabase Edge Function');
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase Konfiguration fehlt');
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parseReplay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[replayParser] Successfully parsed replay:', data);
    
    return data as ParsedReplayData;
    
  } catch (error) {
    console.error('[replayParser] Error:', error);
    throw new Error(`Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
