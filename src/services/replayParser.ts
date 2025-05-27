import { ParsedReplayData } from './replayParser/types';

const GO_SERVICE_URL = import.meta.env.VITE_GO_SERVICE_URL || 'https://replay-mastery-forge.onrender.com';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting parse with Go Service');
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const response = await fetch(`${GO_SERVICE_URL}/parse`, {
      method: 'POST',
      headers: {
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
    
    // Transform Go service response to our expected format
    const transformedData: ParsedReplayData = {
      primaryPlayer: {
        name: data.players[0]?.name || 'Player 1',
        race: data.players[0]?.race || 'Unknown',
        apm: data.players[0]?.apm || 0,
        eapm: data.players[0]?.eapm || 0,
        buildOrder: data.commands.slice(0, 10).map((cmd: any, index: number) => ({
          time: Math.floor(cmd.frame / 24) + 's',
          supply: 10 + index * 2,
          action: cmd.type || 'Unknown Action'
        })),
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
        buildOrder: data.commands.slice(10, 20).map((cmd: any, index: number) => ({
          time: Math.floor(cmd.frame / 24) + 's',
          supply: 12 + index * 2,
          action: cmd.type || 'Unknown Action'
        })),
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
      map: data.header.mapName || 'Unknown Map',
      matchup: `${data.players[0]?.race || 'Unknown'} vs ${data.players[1]?.race || 'Unknown'}`,
      duration: Math.floor(data.header.frames / 24) + 's',
      durationMS: Math.floor(data.header.frames / 24) * 1000,
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
      buildOrder: data.commands.slice(0, 20).map((cmd: any, index: number) => ({
        time: Math.floor(cmd.frame / 24) + 's',
        supply: 10 + index * 2,
        action: cmd.type || 'Unknown Action'
      })),
      trainingPlan: [
        { day: 1, focus: "Macro Management", drill: "Konstante Worker-Produktion üben" },
        { day: 2, focus: "Micro Control", drill: "Einheitenpositionierung verbessern" },
        { day: 3, focus: "Build Order", drill: "Timing-Attacken perfektionieren" }
      ]
    };
    
    return transformedData;
    
  } catch (error) {
    console.error('[replayParser] Error:', error);
    throw new Error(`Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
