
import { ParsedReplayData } from './replayParser/types';
import { parseReplayNative } from './nativeReplayParser';

const GO_SERVICE_URL = import.meta.env.VITE_GO_SERVICE_URL || 'https://replay-mastery-forge.onrender.com';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting parse - trying native parser first');
  console.log('[replayParser] File details:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // Try native parser first
  try {
    console.log('[replayParser] Attempting native parsing...');
    const result = await parseReplayNative(file);
    console.log('[replayParser] Native parsing successful');
    return result;
  } catch (nativeError) {
    console.warn('[replayParser] Native parsing failed, falling back to Go service:', nativeError);
    
    // Fallback to Go service
    try {
      console.log('[replayParser] Converting file to array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('[replayParser] Array buffer size:', arrayBuffer.byteLength);
      
      console.log('[replayParser] Sending request to:', `${GO_SERVICE_URL}/parse`);
      const response = await fetch(`${GO_SERVICE_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });
      
      console.log('[replayParser] Response status:', response.status);
      
      if (!response.ok) {
        console.error('[replayParser] Response not ok:', response.status, response.statusText);
        const errorData = await response.json().catch(() => null);
        console.error('[replayParser] Error data:', errorData);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }
      
      console.log('[replayParser] Parsing response JSON...');
      const data = await response.json();
      console.log('[replayParser] Raw response data:', data);
      
      // Check if we have the expected data structure
      if (!data.players || !Array.isArray(data.players)) {
        console.error('[replayParser] Invalid response structure - no players array');
        throw new Error('Invalid response structure from Go service');
      }
      
      console.log('[replayParser] Found players:', data.players.length);
      
      // Transform Go service response to our expected format
      const transformedData: ParsedReplayData = {
        primaryPlayer: {
          name: data.players[0]?.name || 'Player 1',
          race: data.players[0]?.race || 'Unknown',
          apm: data.players[0]?.apm || 0,
          eapm: data.players[0]?.eapm || 0,
          buildOrder: data.commands?.slice(0, 10).map((cmd: any, index: number) => ({
            time: Math.floor(cmd.frame / 24) + 's',
            supply: 10 + index * 2,
            action: cmd.type || 'Unknown Action'
          })) || [],
          strengths: [
            'Gute Makro-Verwaltung',
            'Starke Einheitenkontrolle'
          ],
          weaknesses: [
            'Langsame Anfangsphase',
            'Schwache Verteidigung'
          ],
          recommendations: [
            'Fokus auf schnellere Worker-Produktion',
            'Verbesserung der Einheitenpositionierung'
          ]
        },
        secondaryPlayer: {
          name: data.players[1]?.name || 'Player 2', 
          race: data.players[1]?.race || 'Unknown',
          apm: data.players[1]?.apm || 0,
          eapm: data.players[1]?.eapm || 0,
          buildOrder: data.commands?.slice(10, 20).map((cmd: any, index: number) => ({
            time: Math.floor(cmd.frame / 24) + 's',
            supply: 12 + index * 2,
            action: cmd.type || 'Unknown Action'
          })) || [],
          strengths: [
            'Effiziente Ressourcennutzung',
            'Gute Defensivpositionierung'
          ],
          weaknesses: [
            'Ineffiziente Build-Order',
            'Späte Expansion'
          ],
          recommendations: [
            'Optimierung der Build-Order für besseres Timing',
            'Frühere Expansion planen'
          ]
        },
        map: data.header?.mapName || 'Unknown Map',
        matchup: `${data.players[0]?.race || 'Unknown'} vs ${data.players[1]?.race || 'Unknown'}`,
        duration: data.header?.frames ? Math.floor(data.header.frames / 24) + 's' : '0s',
        durationMS: data.header?.frames ? Math.floor(data.header.frames / 24) * 1000 : 0,
        date: new Date().toISOString(),
        result: 'unknown',
        strengths: [
          'Gute Makro-Verwaltung',
          'Starke Einheitenkontrolle',
          'Effiziente Ressourcennutzung'
        ],
        weaknesses: [
          'Langsame Anfangsphase', 
          'Schwache Verteidigung',
          'Ineffiziente Build-Order'
        ],
        recommendations: [
          'Fokus auf schnellere Worker-Produktion',
          'Verbesserung der Einheitenpositionierung',
          'Optimierung der Build-Order für besseres Timing'
        ],
        // Legacy properties for backward compatibility
        playerName: data.players[0]?.name || 'Player 1',
        opponentName: data.players[1]?.name || 'Player 2',
        playerRace: data.players[0]?.race || 'Unknown',
        opponentRace: data.players[1]?.race || 'Unknown',
        apm: data.players[0]?.apm || 0,
        eapm: data.players[0]?.eapm || 0,
        opponentApm: data.players[1]?.apm || 0,
        opponentEapm: data.players[1]?.eapm || 0,
        buildOrder: data.commands?.slice(0, 20).map((cmd: any, index: number) => ({
          time: Math.floor(cmd.frame / 24) + 's',
          supply: 10 + index * 2,
          action: cmd.type || 'Unknown Action'
        })) || [],
        trainingPlan: [
          { day: 1, focus: "Macro Management", drill: "Konstante Worker-Produktion üben" },
          { day: 2, focus: "Micro Control", drill: "Einheitenpositionierung verbessern" },
          { day: 3, focus: "Build Order", drill: "Timing-Attacken perfektionieren" }
        ]
      };
      
      console.log('[replayParser] Go service fallback successful');
      return transformedData;
      
    } catch (fallbackError) {
      console.error('[replayParser] Both native and fallback parsing failed:', fallbackError);
      throw new Error(`Parsing fehlgeschlagen: ${fallbackError instanceof Error ? fallbackError.message : 'Unbekannter Fehler'}`);
    }
  }
}
