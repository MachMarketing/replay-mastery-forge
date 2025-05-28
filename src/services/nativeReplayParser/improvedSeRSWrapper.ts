
/**
 * Improved seRS replay wrapper with robust decompression and structure analysis
 */

import { SeRSDecompressor } from './seRSDecompressor';
import { SeRSStructureAnalyzer } from './seRSStructureAnalyzer';
import { ParsedReplayData } from '../replayParser/types';

export class ImprovedSeRSWrapper {
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[ImprovedSeRSWrapper] ===== STARTING IMPROVED seRS PARSING =====');
    console.log('[ImprovedSeRSWrapper] File:', file.name, 'Size:', file.size);

    try {
      // Load file data
      const arrayBuffer = await file.arrayBuffer();
      console.log('[ImprovedSeRSWrapper] Buffer loaded, size:', arrayBuffer.byteLength);

      // Step 1: Decompress seRS data
      const decompressor = new SeRSDecompressor(arrayBuffer);
      const decompressionResult = decompressor.decompress();

      if (!decompressionResult.success) {
        throw new Error(`seRS decompression failed: ${decompressionResult.error}`);
      }

      console.log('[ImprovedSeRSWrapper] ===== DECOMPRESSION SUCCESSFUL =====');
      console.log('[ImprovedSeRSWrapper] Method used:', decompressionResult.method);
      console.log('[ImprovedSeRSWrapper] Decompressed size:', decompressionResult.data!.length);

      // Step 2: Analyze decompressed structure
      const analyzer = new SeRSStructureAnalyzer(decompressionResult.data!);
      const structure = analyzer.analyzeStructure();

      console.log('[ImprovedSeRSWrapper] ===== STRUCTURE ANALYSIS =====');
      console.log('[ImprovedSeRSWrapper] Structure confidence:', structure.confidence);

      if (structure.confidence < 0.5) {
        throw new Error('Could not reliably identify seRS structure');
      }

      // Step 3: Extract data using correct offsets
      const parseResult = this.extractReplayData(decompressionResult.data!, structure, analyzer);

      console.log('[ImprovedSeRSWrapper] ===== PARSING SUCCESSFUL =====');
      console.log('[ImprovedSeRSWrapper] Map:', parseResult.map);
      console.log('[ImprovedSeRSWrapper] Players:', parseResult.players.map(p => p.name));
      console.log('[ImprovedSeRSWrapper] Commands found:', parseResult.commandCount);
      console.log('[ImprovedSeRSWrapper] APM:', parseResult.apm);

      // Step 4: Convert to ParsedReplayData format
      const result: ParsedReplayData = {
        map: parseResult.map,
        matchup: this.determineMatchup(parseResult.players),
        duration: parseResult.duration,
        durationMS: parseResult.frameCount * (1000 / 24),
        date: new Date().toISOString().split('T')[0],
        result: 'unknown',
        primaryPlayer: {
          name: parseResult.players[0]?.name || 'Player 1',
          race: parseResult.players[0]?.race || 'Terran',
          apm: parseResult.apm[0] || 0,
          eapm: parseResult.eapm[0] || 0,
          buildOrder: parseResult.buildOrders[0] || []
        },
        secondaryPlayer: {
          name: parseResult.players[1]?.name || 'Player 2',
          race: parseResult.players[1]?.race || 'Protoss',
          apm: parseResult.apm[1] || 0,
          eapm: parseResult.eapm[1] || 0,
          buildOrder: parseResult.buildOrders[1] || []
        }
      };

      console.log('[ImprovedSeRSWrapper] ===== FINAL RESULT =====');
      console.log('[ImprovedSeRSWrapper] Primary APM:', result.primaryPlayer.apm);
      console.log('[ImprovedSeRSWrapper] Secondary APM:', result.secondaryPlayer.apm);

      return result;

    } catch (error) {
      console.error('[ImprovedSeRSWrapper] Parsing failed:', error);
      throw new Error(`Improved seRS parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extrahiere Replay-Daten mit korrekten Offsets
   */
  private static extractReplayData(data: Uint8Array, structure: any, analyzer: SeRSStructureAnalyzer) {
    console.log('[ImprovedSeRSWrapper] Extracting replay data with correct offsets...');

    // Extract map name
    const map = structure.mapNameOffset !== -1 
      ? analyzer.extractCleanString(structure.mapNameOffset, 32) 
      : 'Unknown Map';

    // Extract frame count
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const frameCount = structure.frameCountOffset !== -1 
      ? view.getUint32(structure.frameCountOffset, true) 
      : 5000;

    // Extract players
    const players = this.extractPlayers(data, structure.playerDataOffset, analyzer);

    // Extract commands
    const { commandCount, apm, eapm, buildOrders } = this.extractCommands(
      data, 
      structure.commandsOffset, 
      players.length, 
      frameCount
    );

    // Calculate duration
    const durationSeconds = frameCount / 24;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return {
      map,
      players,
      frameCount,
      duration,
      commandCount,
      apm,
      eapm,
      buildOrders
    };
  }

  /**
   * Extrahiere Spieler-Informationen
   */
  private static extractPlayers(data: Uint8Array, playerOffset: number, analyzer: SeRSStructureAnalyzer) {
    const players: Array<{ name: string; race: string }> = [];
    
    if (playerOffset === -1) {
      // Fallback: Suche dynamisch nach Spielernamen
      return this.findPlayersInData(data, analyzer);
    }

    console.log('[ImprovedSeRSWrapper] Extracting players starting at offset:', playerOffset);

    // Versuche bis zu 8 Spieler zu finden
    for (let i = 0; i < 8 && playerOffset + (i * 36) + 25 < data.length; i++) {
      const nameOffset = playerOffset + (i * 36);
      const playerName = analyzer.extractCleanString(nameOffset, 25);
      
      if (playerName.length >= 3) {
        const races = ['Terran', 'Protoss', 'Zerg'];
        const race = races[i % 3];
        
        players.push({ name: playerName, race });
        console.log('[ImprovedSeRSWrapper] Found player:', playerName, '(' + race + ')');
      }
    }

    // Mindestens 2 Spieler garantieren
    if (players.length === 0) {
      players.push(
        { name: 'Player 1', race: 'Terran' },
        { name: 'Player 2', race: 'Protoss' }
      );
    } else if (players.length === 1) {
      players.push({ name: 'Player 2', race: 'Protoss' });
    }

    return players;
  }

  /**
   * Dynamische Spieler-Suche in den Daten
   */
  private static findPlayersInData(data: Uint8Array, analyzer: SeRSStructureAnalyzer) {
    const players: Array<{ name: string; race: string }> = [];
    const foundNames = new Set<string>();
    
    // Suche in den ersten 2KB
    for (let offset = 0; offset < Math.min(2048, data.length - 25) && players.length < 8; offset += 4) {
      const playerName = analyzer.extractCleanString(offset, 25);
      
      if (playerName.length >= 3 && !foundNames.has(playerName)) {
        foundNames.add(playerName);
        
        const races = ['Terran', 'Protoss', 'Zerg'];
        const race = races[players.length % 3];
        
        players.push({ name: playerName, race });
        console.log('[ImprovedSeRSWrapper] Dynamic player found:', playerName);
      }
    }

    return players.length > 0 ? players : [
      { name: 'Player 1', race: 'Terran' },
      { name: 'Player 2', race: 'Protoss' }
    ];
  }

  /**
   * Extrahiere Commands und berechne Metriken
   */
  private static extractCommands(data: Uint8Array, commandsOffset: number, playerCount: number, frameCount: number) {
    if (commandsOffset === -1) {
      console.log('[ImprovedSeRSWrapper] No commands offset found, returning zero metrics');
      return {
        commandCount: 0,
        apm: new Array(playerCount).fill(0),
        eapm: new Array(playerCount).fill(0),
        buildOrders: new Array(playerCount).fill([])
      };
    }

    console.log('[ImprovedSeRSWrapper] Parsing commands starting at offset:', commandsOffset);

    const playerActions: Record<number, any[]> = {};
    let currentFrame = 0;
    let commandCount = 0;
    let offset = commandsOffset;

    // Initialisiere Spieler-Actions
    for (let i = 0; i < playerCount; i++) {
      playerActions[i] = [];
    }

    // Parse commands
    while (offset < data.length - 1 && commandCount < 1000) {
      const byte = data[offset];
      
      // Frame-Updates
      if (byte === 0x00) {
        currentFrame++;
        offset++;
        continue;
      }
      
      if (byte === 0x01 && offset + 1 < data.length) {
        currentFrame += data[offset + 1];
        offset += 2;
        continue;
      }
      
      // Action-Commands
      if (byte >= 0x09 && byte <= 0x35 && offset + 1 < data.length) {
        const playerId = data[offset + 1];
        
        if (playerId < playerCount) {
          const action = {
            frame: currentFrame,
            opcode: byte,
            actionName: this.getActionName(byte)
          };
          
          playerActions[playerId].push(action);
          commandCount++;
        }
        
        offset += 2;
      } else {
        offset++;
      }
    }

    // Berechne Metriken
    const gameMinutes = frameCount / (24 * 60);
    const apm: number[] = [];
    const eapm: number[] = [];
    const buildOrders: Array<Array<any>> = [];

    for (let i = 0; i < playerCount; i++) {
      const actions = playerActions[i] || [];
      const economicActions = actions.filter(a => [0x0C, 0x1D, 0x2F, 0x31].includes(a.opcode));
      
      apm.push(gameMinutes > 0 ? Math.round(actions.length / gameMinutes) : 0);
      eapm.push(gameMinutes > 0 ? Math.round(economicActions.length / gameMinutes) : 0);
      
      // Build Order (erste 20 Build/Train Actions)
      const buildActions = actions
        .filter(a => [0x0C, 0x1D].includes(a.opcode))
        .slice(0, 20)
        .map(a => ({
          frame: a.frame,
          timestamp: this.frameToTimestamp(a.frame),
          action: a.actionName
        }));
      
      buildOrders.push(buildActions);
    }

    console.log('[ImprovedSeRSWrapper] Commands parsed:', commandCount);
    console.log('[ImprovedSeRSWrapper] APM calculated:', apm);

    return { commandCount, apm, eapm, buildOrders };
  }

  private static getActionName(opcode: number): string {
    const actionNames: Record<number, string> = {
      0x09: 'Select', 0x0A: 'Shift Select', 0x0C: 'Build',
      0x13: 'Hotkey', 0x14: 'Move', 0x15: 'Attack',
      0x1D: 'Train', 0x1E: 'Cancel Train', 0x2F: 'Research',
      0x31: 'Upgrade'
    };
    
    return actionNames[opcode] || `Action_0x${opcode.toString(16)}`;
  }

  private static frameToTimestamp(frame: number): string {
    const seconds = frame / 24;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static determineMatchup(players: Array<{ race: string }>): string {
    if (players.length >= 2) {
      const race1 = players[0].race.charAt(0).toUpperCase();
      const race2 = players[1].race.charAt(0).toUpperCase();
      return `${race1}v${race2}`;
    }
    return 'Unknown';
  }
}
