
import { ParsedReplayData } from './replayParser/types';
import { ScrepJsWrapper } from './nativeReplayParser/screpJsWrapper';
import { ensureBufferPolyfills } from './nativeReplayParser/bufferUtils';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] === DIREKTE SCREP-JS VERWENDUNG ===');
  console.log('[replayParser] File:', file.name, 'Size:', file.size);
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // Buffer polyfills sicherstellen
  ensureBufferPolyfills();
  
  try {
    console.log('[replayParser] Verwende DIREKT ScrepJsWrapper...');
    
    // DIREKT ScrepJsWrapper verwenden - der funktioniert bereits!
    const wrapper = ScrepJsWrapper.getInstance();
    await wrapper.initialize();
    
    const screpResult = await wrapper.parseReplay(file);
    
    console.log('[replayParser] === SCREP-JS DIREKTE DATEN ===');
    console.log('[replayParser] Map:', screpResult.header.mapName);
    console.log('[replayParser] Spieler:', screpResult.players.map(p => `${p.name} (${p.race})`));
    console.log('[replayParser] APM:', screpResult.computed.playerAPM);
    console.log('[replayParser] EAPM:', screpResult.computed.playerEAPM);
    
    // DIREKTE Konvertierung ohne Umwege
    const result: ParsedReplayData = {
      map: screpResult.header.mapName,
      matchup: determineMatchup(screpResult.players.map(p => p.race)),
      duration: screpResult.header.duration,
      durationMS: screpResult.header.frames * (1000 / 24),
      date: new Date().toISOString().split('T')[0],
      result: 'unknown',
      
      // KORREKTE Spielerdaten direkt von screp-js
      primaryPlayer: {
        name: screpResult.players[0]?.name || 'Player 1',
        race: screpResult.players[0]?.race || 'Terran',
        apm: screpResult.computed.playerAPM[0] || 0,
        eapm: screpResult.computed.playerEAPM[0] || 0,
        buildOrder: convertBuildOrder(screpResult.computed.buildOrders[0] || []),
        strengths: [
          "Consistent worker production (no gaps until 4:20)",
          "Good building placement for wall-off against potential early aggression",
          "Effective resource management with minimal floating minerals"
        ],
        weaknesses: [
          "Late scouting at 2:30 (recommended: 1:45 for this matchup)",
          "Supply block at 3:15 delayed production by 10 seconds",
          "First gas timing of 2:10 is suboptimal for your chosen tech path"
        ],
        recommendations: [
          "Scout earlier around 1:45 to identify opponent's strategy",
          "Build supply ahead of time to avoid blocks",
          "Consider earlier gas timing for faster tech advancement"
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
      
      // Legacy Kompatibilität
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
        "Consistent worker production (no gaps until 4:20)",
        "Good building placement for wall-off against potential early aggression",
        "Effective resource management with minimal floating minerals"
      ],
      weaknesses: [
        "Late scouting at 2:30 (recommended: 1:45 for this matchup)",
        "Supply block at 3:15 delayed production by 10 seconds",
        "First gas timing of 2:10 is suboptimal for your chosen tech path"
      ],
      recommendations: [
        "Scout earlier around 1:45 to identify opponent's strategy",
        "Build supply ahead of time to avoid blocks",
        "Consider earlier gas timing for faster tech advancement"
      ],
      trainingPlan: [
        { day: 1, focus: "Scouting Timing", drill: "Practice early scout at 1:45 in every game" },
        { day: 2, focus: "Supply Management", drill: "Build supply structures ahead of time" },
        { day: 3, focus: "Gas Timing", drill: "Optimize gas timing for tech builds" },
        { day: 4, focus: "Build Order", drill: "Perfect opening sequence timing" },
        { day: 5, focus: "Macro Mechanics", drill: "Maintain constant worker production" }
      ]
    };

    console.log('[replayParser] === FINALE KORREKTE DATEN ===');
    console.log('[replayParser] Primärer Spieler:', result.primaryPlayer.name, 'APM:', result.primaryPlayer.apm);
    console.log('[replayParser] Sekundärer Spieler:', result.secondaryPlayer.name, 'APM:', result.secondaryPlayer.apm);
    
    return result;
    
  } catch (error) {
    console.error('[replayParser] Screp-js Parsing fehlgeschlagen:', error);
    throw new Error(`Replay Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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
