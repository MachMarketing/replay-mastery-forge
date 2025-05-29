
/**
 * Native Action Parser for StarCraft: Brood War Remastered
 * FIXED FOR CORRECT FRAME COUNTING AND APM
 */

import * as pako from 'pako';
import { ReplayDecompressor } from './decompressor';
import { CompressionDetector } from './compressionDetector';

export interface RemasteredAction {
  frame: number;
  playerId: number;
  actionType: string;
  actionId: number;
  data: Uint8Array;
  timestamp: string;
  supply?: number;
  mineral?: number;
  gas?: number;
  unitId?: number;
  targetX?: number;
  targetY?: number;
}

export interface RemasteredBuildOrder {
  frame: number;
  timestamp: string;
  action: string;
  supply?: number;
  playerId: number;
}

export interface RemasteredActionData {
  actions: RemasteredAction[];
  buildOrders: RemasteredBuildOrder[][];
  playerActions: Record<number, RemasteredAction[]>;
  frameCount: number;
  gameSpeed: number;
  totalActionCount: number;
  realAPM: number[];
  gameMinutes: number;
}

export class RemasteredActionParser {
  private static readonly REMASTERED_FPS = 23.81; // Exakte Remastered FPS
  
  // KORREKTE BWAPI Command IDs für Remastered
  private static readonly ACTION_TYPES: Record<number, string> = {
    0x09: 'Select',
    0x0A: 'Shift Select', 
    0x0B: 'Shift Deselect',
    0x0C: 'Build',
    0x0D: 'Vision',
    0x0E: 'Alliance',
    0x10: 'Stop',
    0x11: 'Attack Move',
    0x12: 'Cheat',
    0x13: 'Right Click',
    0x14: 'Train',
    0x15: 'Attack',
    0x16: 'Cancel',
    0x17: 'Cancel Hatch',
    0x18: 'Stop',
    0x19: 'Carrier Stop',
    0x1A: 'Use Tech',
    0x1B: 'Use Tech Position',
    0x1C: 'Return Cargo',
    0x1D: 'Train Unit',
    0x1E: 'Cancel Train',
    0x1F: 'Cloak',
    0x20: 'Build Self',
    0x21: 'Unit Morph',
    0x22: 'Unload',
    0x23: 'Unsiege',
    0x24: 'Siege',
    0x25: 'Train Fighter',
    0x26: 'Unload All',
    0x27: 'Unload All',
    0x28: 'Unload',
    0x29: 'Merge Archon',
    0x2A: 'Hold Position',
    0x2B: 'Burrow',
    0x2C: 'Unburrow',
    0x2D: 'Cancel Nuke',
    0x2E: 'Lift',
    0x2F: 'Research',
    0x30: 'Cancel Research',
    0x31: 'Upgrade',
    0x32: 'Cancel Upgrade',
    0x33: 'Cancel Addon',
    0x34: 'Building Morph',
    0x35: 'Stim',
    0x36: 'Sync'
  };

  // Commands die für APM zählen (keine Sync-Commands)
  private static readonly APM_RELEVANT_COMMANDS = [
    0x09, 0x0A, 0x0B, 0x0C, 0x10, 0x11, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25,
    0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31,
    0x32, 0x33, 0x34, 0x35
  ];

  /**
   * Parse actions from a Remastered replay file mit korrekter Frame-Zählung
   */
  static async parseActions(file: File): Promise<RemasteredActionData> {
    console.log('[RemasteredActionParser] === STARTING FIXED REMASTERED PARSING ===');
    console.log('[RemasteredActionParser] File:', file.name, 'Size:', file.size);
    
    const buffer = await file.arrayBuffer();
    
    // Finde den korrekten Command-Bereich
    console.log('[RemasteredActionParser] Locating command section...');
    const result = this.parseCommandSection(buffer);
    
    console.log('[RemasteredActionParser] === FINAL CORRECTED STATISTICS ===');
    console.log('[RemasteredActionParser] Total actions extracted:', result.totalActionCount);
    console.log('[RemasteredActionParser] Corrected game minutes:', result.gameMinutes.toFixed(2));
    console.log('[RemasteredActionParser] Fixed APM:', result.realAPM);
    console.log('[RemasteredActionParser] Final frame count:', result.frameCount);
    
    return result;
  }

  /**
   * KORRIGIERTE Command-Section Parsing
   */
  private static parseCommandSection(buffer: ArrayBuffer): RemasteredActionData {
    console.log('[RemasteredActionParser] === PARSING COMMAND SECTION ===');
    const uint8View = new Uint8Array(buffer);
    
    // Finde Command-Start durch Suche nach bekannten Patterns
    const commandStart = this.findCorrectCommandStart(uint8View);
    console.log('[RemasteredActionParser] Command section starts at:', commandStart);
    
    const actions: RemasteredAction[] = [];
    let currentFrame = 0;
    let position = commandStart;
    let maxSafeFrame = 50000; // Sicherheitsgrenze für realistische Spiele
    
    // Parse Commands mit korrekter Frame-Logik
    while (position < uint8View.length - 10 && currentFrame < maxSafeFrame) {
      const byte = uint8View[position];
      
      // Frame-Advance Commands (korrekte Logik)
      if (byte === 0x00) {
        // Frame + 1
        currentFrame++;
        position++;
        continue;
      } else if (byte === 0x01 && position + 1 < uint8View.length) {
        // Frame + N (1 Byte)
        const frameAdd = uint8View[position + 1];
        currentFrame += frameAdd;
        position += 2;
        continue;
      } else if (byte === 0x02 && position + 2 < uint8View.length) {
        // Frame + N (2 Bytes)
        const view = new DataView(uint8View.buffer);
        const frameAdd = view.getUint16(position + 1, true);
        currentFrame += frameAdd;
        position += 3;
        continue;
      } else if (byte === 0x03 && position + 4 < uint8View.length) {
        // Frame + N (4 Bytes) - große Sprünge abfangen
        const view = new DataView(uint8View.buffer);
        const frameAdd = view.getUint32(position + 1, true);
        if (frameAdd > 10000) {
          // Unglaubwürdig großer Frame-Sprung - stoppe Parsing
          console.log('[RemasteredActionParser] Unrealistic frame jump detected:', frameAdd, 'at position:', position);
          break;
        }
        currentFrame += frameAdd;
        position += 5;
        continue;
      }
      
      // Prüfe auf bekannte Action Commands
      if (this.ACTION_TYPES[byte]) {
        const commandLength = this.getCommandLength(byte);
        
        if (position + commandLength <= uint8View.length) {
          const playerId = position + 1 < uint8View.length ? uint8View[position + 1] : 0;
          
          // Nur gültige Player IDs (0-11 für Remastered)
          if (playerId <= 11) {
            const data = uint8View.slice(position, position + commandLength);
            
            actions.push({
              frame: currentFrame,
              playerId,
              actionType: this.ACTION_TYPES[byte],
              actionId: byte,
              data,
              timestamp: this.frameToTimestamp(currentFrame)
            });
          }
          
          position += commandLength;
        } else {
          position++;
        }
      } else {
        position++;
      }
      
      // Performance-Schutz
      if (actions.length > 20000) {
        console.log('[RemasteredActionParser] Performance limit reached at', actions.length, 'actions');
        break;
      }
    }
    
    console.log('[RemasteredActionParser] Command parsing complete:', {
      totalActions: actions.length,
      finalFrame: currentFrame,
      uniqueCommands: Object.keys(this.ACTION_TYPES).filter(id => 
        actions.some(a => a.actionId === parseInt(id))
      ).length,
      frameRange: `0 - ${currentFrame}`
    });
    
    // Gruppiere nach Spielern
    const playerActions = this.groupActionsByPlayer(actions);
    
    // Berechne KORREKTE APM mit realistischem Frame-Count
    const gameMinutes = currentFrame / this.REMASTERED_FPS / 60;
    const realAPM = this.calculateCorrectAPM(playerActions, gameMinutes);
    
    // Generiere Build Orders
    const buildOrders = this.generateBuildOrders(actions, playerActions);
    
    console.log('[RemasteredActionParser] Corrected APM Calculation:', {
      gameMinutes: gameMinutes.toFixed(2),
      frameCount: currentFrame,
      playerActionCounts: Object.entries(playerActions).map(([id, acts]) => `P${id}: ${acts.length}`),
      calculatedAPM: realAPM
    });
    
    return {
      actions,
      buildOrders,
      playerActions,
      frameCount: currentFrame, // Korrigierte Frame-Anzahl
      gameSpeed: 1.0,
      totalActionCount: actions.length,
      realAPM,
      gameMinutes
    };
  }

  /**
   * Finde den korrekten Command-Start für Remastered
   */
  private static findCorrectCommandStart(data: Uint8Array): number {
    // Mehrere mögliche Offsets für verschiedene Remastered-Versionen
    const possibleOffsets = [633, 640, 650, 700, 800, 1000];
    
    for (const offset of possibleOffsets) {
      if (offset + 100 < data.length) {
        let commandScore = 0;
        let frameCommands = 0;
        
        // Teste die ersten 100 Bytes nach diesem Offset
        for (let i = 0; i < 100; i++) {
          const byte = data[offset + i];
          
          // Frame-Advance Commands
          if (byte <= 0x03) {
            frameCommands++;
          }
          
          // Bekannte Action Commands
          if (this.ACTION_TYPES[byte]) {
            commandScore += 2;
          }
        }
        
        // Guter Offset sollte sowohl Frame- als auch Action-Commands haben
        if (commandScore >= 5 && frameCommands >= 3) {
          console.log('[RemasteredActionParser] Found promising command start at:', offset, 'score:', commandScore, 'frameCommands:', frameCommands);
          return offset;
        }
      }
    }
    
    console.log('[RemasteredActionParser] Using fallback command start: 633');
    return 633; // Fallback
  }

  /**
   * KORREKTE APM-Berechnung für Remastered
   */
  private static calculateCorrectAPM(playerActions: Record<number, RemasteredAction[]>, gameMinutes: number): number[] {
    const apm: number[] = [];
    
    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      // Nur APM-relevante Commands zählen
      const apmActions = actions.filter(action => 
        this.APM_RELEVANT_COMMANDS.includes(action.actionId)
      );
      
      const playerAPM = gameMinutes > 0 ? Math.round(apmActions.length / gameMinutes) : 0;
      apm.push(playerAPM);
      
      if (apmActions.length > 0) {
        console.log(`[RemasteredActionParser] Player ${playerId} corrected APM:`, {
          totalActions: actions.length,
          apmActions: apmActions.length,
          gameMinutes: gameMinutes.toFixed(2),
          calculatedAPM: playerAPM
        });
      }
    }
    
    return apm;
  }

  /**
   * Command-Längen basierend auf BWAPI-Spezifikation
   */
  private static getCommandLength(commandByte: number): number {
    const lengths: Record<number, number> = {
      0x09: 2,   // Select
      0x0A: 2,   // Shift Select
      0x0B: 2,   // Shift Deselect
      0x0C: 10,  // Build
      0x0D: 2,   // Vision
      0x0E: 4,   // Alliance
      0x10: 1,   // Stop
      0x11: 10,  // Attack Move
      0x12: 2,   // Cheat
      0x13: 10,  // Right Click
      0x14: 6,   // Train
      0x15: 6,   // Attack
      0x16: 1,   // Cancel
      0x17: 1,   // Cancel Hatch
      0x18: 1,   // Stop
      0x19: 1,   // Carrier Stop
      0x1A: 6,   // Use Tech
      0x1B: 10,  // Use Tech Position
      0x1C: 1,   // Return Cargo
      0x1D: 6,   // Train Unit
      0x1E: 2,   // Cancel Train
      0x1F: 1,   // Cloak
      0x20: 6,   // Build Self
      0x21: 2,   // Unit Morph
      0x22: 2,   // Unload
      0x23: 1,   // Unsiege
      0x24: 1,   // Siege
      0x25: 2,   // Train Fighter
      0x26: 1,   // Unload All
      0x27: 1,   // Unload All
      0x28: 2,   // Unload
      0x29: 1,   // Merge Archon
      0x2A: 1,   // Hold Position
      0x2B: 1,   // Burrow
      0x2C: 1,   // Unburrow
      0x2D: 1,   // Cancel Nuke
      0x2E: 1,   // Lift
      0x2F: 2,   // Research
      0x30: 2,   // Cancel Research
      0x31: 2,   // Upgrade
      0x32: 2,   // Cancel Upgrade
      0x33: 2,   // Cancel Addon
      0x34: 2,   // Building Morph
      0x35: 1,   // Stim
      0x36: 1    // Sync
    };
    
    return lengths[commandByte] || 1;
  }

  private static groupActionsByPlayer(actions: RemasteredAction[]): Record<number, RemasteredAction[]> {
    const playerActions: Record<number, RemasteredAction[]> = {};
    
    for (const action of actions) {
      if (!playerActions[action.playerId]) {
        playerActions[action.playerId] = [];
      }
      playerActions[action.playerId].push(action);
    }
    
    return playerActions;
  }

  private static generateBuildOrders(actions: RemasteredAction[], playerActions: Record<number, RemasteredAction[]>): RemasteredBuildOrder[][] {
    const buildOrders: RemasteredBuildOrder[][] = [];
    
    for (const [playerIdStr, playerActionList] of Object.entries(playerActions)) {
      const playerId = parseInt(playerIdStr);
      const buildOrder: RemasteredBuildOrder[] = [];
      
      for (const action of playerActionList) {
        if (this.isBuildAction(action)) {
          buildOrder.push({
            frame: action.frame,
            timestamp: action.timestamp,
            action: this.getBuildActionDescription(action),
            playerId
          });
        }
      }
      
      buildOrder.sort((a, b) => a.frame - b.frame);
      buildOrders[playerId] = buildOrder;
    }
    
    return buildOrders;
  }

  private static isBuildAction(action: RemasteredAction): boolean {
    const buildActionIds = [0x0C, 0x14, 0x1D, 0x21, 0x2F, 0x31, 0x34];
    return buildActionIds.includes(action.actionId);
  }

  private static getBuildActionDescription(action: RemasteredAction): string {
    switch (action.actionId) {
      case 0x0C: return `Build structure`;
      case 0x14:
      case 0x1D: return `Train unit`;
      case 0x21: return `Unit morph`;
      case 0x2F: return `Research technology`;
      case 0x31: return `Upgrade`;
      case 0x34: return `Building morph`;
      default: return action.actionType;
    }
  }

  private static frameToTimestamp(frame: number): string {
    const seconds = frame / this.REMASTERED_FPS;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
