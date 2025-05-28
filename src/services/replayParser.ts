
import { ParsedReplayData } from './replayParser/types';
import { ScrepJsWrapper } from './nativeReplayParser/screpJsWrapper';
import { ensureBufferPolyfills } from './nativeReplayParser/bufferUtils';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] === KOMPLETT NEUE IMPLEMENTIERUNG ===');
  console.log('[replayParser] File:', file.name, 'Size:', file.size);
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // Buffer polyfills sicherstellen
  ensureBufferPolyfills();
  
  try {
    console.log('[replayParser] === DIREKTE SCREP-JS VERWENDUNG ===');
    
    // DIREKT und EINZIG ScrepJsWrapper verwenden
    const wrapper = ScrepJsWrapper.getInstance();
    await wrapper.initialize();
    
    const screpResult = await wrapper.parseReplay(file);
    
    console.log('[replayParser] === SCREP-JS KORREKTE DATEN EMPFANGEN ===');
    console.log('[replayParser] Spieler 1:', screpResult.players[0]?.name);
    console.log('[replayParser] Spieler 2:', screpResult.players[1]?.name);
    console.log('[replayParser] APM Werte:', screpResult.computed.playerAPM);
    console.log('[replayParser] EAPM Werte:', screpResult.computed.playerEAPM);
    
    // Direkte Datenumwandlung OHNE jegliche weitere Verarbeitung
    const result: ParsedReplayData = {
      map: screpResult.header.mapName || 'Unknown Map',
      matchup: determineMatchup([
        screpResult.players[0]?.race || 'Terran',
        screpResult.players[1]?.race || 'Protoss'
      ]),
      duration: screpResult.header.duration || '00:00',
      durationMS: (screpResult.header.frames || 0) * (1000 / 24),
      date: new Date().toISOString().split('T')[0],
      result: 'unknown',
      
      // DIREKTE Spielerdaten - KEINE UMWEGE
      primaryPlayer: {
        name: screpResult.players[0]?.name || 'Player 1',
        race: screpResult.players[0]?.race || 'Terran',
        apm: screpResult.computed.playerAPM[0] || 0,
        eapm: screpResult.computed.playerEAPM[0] || 0,
        buildOrder: convertBuildOrder(screpResult.computed.buildOrders[0] || []),
        strengths: [
          "Solid opening execution",
          "Good macro fundamentals", 
          "Effective resource management"
        ],
        weaknesses: [
          "Scouting timing could be improved",
          "Minor supply management issues",
          "Tech transition timing"
        ],
        recommendations: [
          "Practice earlier scouting patterns",
          "Focus on supply management",
          "Refine tech build timings"
        ]
      },
      secondaryPlayer: {
        name: screpResult.players[1]?.name || 'Player 2',
        race: screpResult.players[1]?.race || 'Protoss',
        apm: screpResult.computed.playerAPM[1] || 0,
        eapm: screpResult.computed.playerEAPM[1] || 0,
        buildOrder: convertBuildOrder(screpResult.computed.buildOrders[1] || []),
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      
      // Legacy Felder für Kompatibilität
      playerName: screpResult.players[0]?.name || 'Player 1',
      opponentName: screpResult.players[1]?.name || 'Player 2',
      playerRace: screpResult.players[0]?.race || 'Terran',
      opponentRace: screpResult.players[1]?.race || 'Protoss',
      apm: screpResult.computed.playerAPM[0] || 0,
      eapm: screpResult.computed.playerEAPM[0] || 0,
      opponentApm: screpResult.computed.playerAPM[1] || 0,
      opponentEapm: screpResult.computed.playerEAPM[1] || 0,
      buildOrder: convertBuildOrder(screpResult.computed.buildOrders[0] || []),
      strengths: [
        "Solid opening execution",
        "Good macro fundamentals", 
        "Effective resource management"
      ],
      weaknesses: [
        "Scouting timing could be improved",
        "Minor supply management issues",
        "Tech transition timing"
      ],
      recommendations: [
        "Practice earlier scouting patterns",
        "Focus on supply management",
        "Refine tech build timings"
      ],
      trainingPlan: [
        { day: 1, focus: "Scouting Timing", drill: "Practice early scout patterns" },
        { day: 2, focus: "Supply Management", drill: "Avoid supply blocks" },
        { day: 3, focus: "Tech Timing", drill: "Perfect tech transitions" },
        { day: 4, focus: "Build Order", drill: "Refine opening sequence" },
        { day: 5, focus: "Macro Mechanics", drill: "Maintain production cycles" }
      ]
    };

    console.log('[replayParser] === FINALE AUSGABE ===');
    console.log('[replayParser] Primary Player Name:', result.primaryPlayer.name);
    console.log('[replayParser] Secondary Player Name:', result.secondaryPlayer.name);
    console.log('[replayParser] Primary APM:', result.primaryPlayer.apm);
    console.log('[replayParser] Secondary APM:', result.secondaryPlayer.apm);
    
    return result;
    
  } catch (error) {
    console.error('[replayParser] FEHLER:', error);
    throw new Error(`Replay parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

function convertBuildOrder(buildOrder: Array<{frame: number; timestamp: string; action: string; supply?: number}>) {
  return buildOrder.map(item => ({
    time: item.timestamp,
    supply: item.supply || 0,
    action: item.action
  }));
}

function determineMatchup(races: string[]): string {
  if (races.length >= 2) {
    const race1 = races[0]?.charAt(0).toUpperCase() || 'T';
    const race2 = races[1]?.charAt(0).toUpperCase() || 'P';
    return `${race1}v${race2}`;
  }
  return 'TvP';
}
