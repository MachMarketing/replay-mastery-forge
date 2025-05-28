
/**
 * Native Action Parser for StarCraft: Brood War Remastered
 * Handles Remastered-specific compression and extracts detailed action data
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
}

export class RemasteredActionParser {
  private static readonly FRAMES_PER_SECOND = 24;
  private static readonly ACTION_TYPES: Record<number, string> = {
    0x09: 'Select',
    0x0A: 'Shift Select',
    0x0B: 'Shift Deselect',
    0x0C: 'Build',
    0x0D: 'Vision',
    0x0E: 'Alliance',
    0x13: 'Hotkey',
    0x14: 'Move',
    0x15: 'Attack',
    0x16: 'Cancel',
    0x17: 'Cancel Hatch',
    0x18: 'Stop',
    0x1D: 'Train',
    0x1E: 'Cancel Train',
    0x1F: 'Cloak',
    0x20: 'Decloak',
    0x21: 'Unit Morph',
    0x2F: 'Research',
    0x30: 'Cancel Research',
    0x31: 'Upgrade',
    0x32: 'Cancel Upgrade',
    0x34: 'Building Morph'
  };

  /**
   * Parse actions from a Remastered replay file
   */
  static async parseActions(file: File): Promise<RemasteredActionData> {
    console.log('[RemasteredActionParser] Starting Remastered action parsing');
    
    const buffer = await file.arrayBuffer();
    const format = CompressionDetector.detectFormat(buffer);
    
    console.log('[RemasteredActionParser] Detected format:', format);
    
    // Decompress if needed
    let decompressedBuffer = buffer;
    if (format.needsDecompression) {
      console.log('[RemasteredActionParser] Decompressing Remastered format');
      decompressedBuffer = await ReplayDecompressor.decompress(buffer, format);
    }
    
    // Extract action data from the decompressed buffer
    return this.extractActionData(decompressedBuffer);
  }

  /**
   * Extract detailed action data from decompressed replay buffer
   */
  private static extractActionData(buffer: ArrayBuffer): RemasteredActionData {
    console.log('[RemasteredActionParser] Extracting action data from buffer');
    
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    
    // Find the commands section (usually starts at offset 0x279 = 633)
    const commandsOffset = this.findCommandsOffset(uint8View);
    console.log('[RemasteredActionParser] Commands start at offset:', commandsOffset);
    
    if (commandsOffset === -1) {
      throw new Error('Could not find commands section in replay');
    }
    
    // Parse the command stream
    const actions = this.parseCommandStream(view, commandsOffset);
    console.log('[RemasteredActionParser] Extracted', actions.length, 'actions');
    
    // Group actions by player
    const playerActions = this.groupActionsByPlayer(actions);
    
    // Generate build orders from actions
    const buildOrders = this.generateBuildOrders(actions, playerActions);
    
    // Calculate frame count and game speed
    const frameCount = actions.length > 0 ? Math.max(...actions.map(a => a.frame)) : 0;
    const gameSpeed = this.calculateGameSpeed(actions);
    
    return {
      actions,
      buildOrders,
      playerActions,
      frameCount,
      gameSpeed
    };
  }

  /**
   * Find the offset where commands start in the replay
   */
  private static findCommandsOffset(data: Uint8Array): number {
    // Standard offset for most replays
    const standardOffset = 633; // 0x279
    
    // Check if standard offset is valid
    if (standardOffset < data.length) {
      // Look for command patterns around this area
      for (let i = standardOffset - 50; i < standardOffset + 100 && i < data.length - 10; i++) {
        if (this.looksLikeCommandStart(data, i)) {
          console.log('[RemasteredActionParser] Found commands at offset:', i);
          return i;
        }
      }
    }
    
    // Fallback: scan the entire file for command patterns
    console.log('[RemasteredActionParser] Scanning entire file for commands');
    for (let i = 500; i < data.length - 100; i++) {
      if (this.looksLikeCommandStart(data, i)) {
        console.log('[RemasteredActionParser] Found commands at offset:', i);
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Check if the data at a position looks like the start of commands
   */
  private static looksLikeCommandStart(data: Uint8Array, offset: number): boolean {
    if (offset + 20 >= data.length) return false;
    
    // Look for patterns typical of command streams
    let commandLikeBytes = 0;
    
    for (let i = 0; i < 20; i++) {
      const byte = data[offset + i];
      
      // Frame sync bytes (0x00, 0x01, 0x02)
      if (byte <= 0x02) commandLikeBytes++;
      
      // Known command bytes
      if (this.ACTION_TYPES[byte]) commandLikeBytes += 2;
      
      // Player IDs (typically 0-7)
      if (byte >= 0x00 && byte <= 0x07) commandLikeBytes++;
    }
    
    return commandLikeBytes >= 8;
  }

  /**
   * Parse the command stream to extract actions
   */
  private static parseCommandStream(view: DataView, offset: number): RemasteredAction[] {
    console.log('[RemasteredActionParser] Parsing command stream from offset:', offset);
    
    const actions: RemasteredAction[] = [];
    let currentFrame = 0;
    let position = offset;
    const maxActions = 5000; // Limit for performance
    
    while (position < view.byteLength - 1 && actions.length < maxActions) {
      try {
        const byte = view.getUint8(position);
        position++;
        
        // Handle frame synchronization
        if (byte === 0x00) {
          currentFrame++;
          continue;
        } else if (byte === 0x01) {
          // Frame skip with count
          if (position < view.byteLength) {
            const skipFrames = view.getUint8(position);
            position++;
            currentFrame += skipFrames;
          }
          continue;
        } else if (byte === 0x02) {
          // Large frame skip
          if (position + 1 < view.byteLength) {
            const skipFrames = view.getUint16(position, true);
            position += 2;
            currentFrame += skipFrames;
          }
          continue;
        }
        
        // Parse action command
        const action = this.parseAction(view, position - 1, currentFrame, byte);
        if (action) {
          actions.push(action);
          position += this.getCommandLength(byte) - 1; // -1 because we already read the command byte
        }
        
      } catch (error) {
        console.warn('[RemasteredActionParser] Error parsing command at position:', position, error);
        break;
      }
    }
    
    console.log('[RemasteredActionParser] Parsed', actions.length, 'actions, final frame:', currentFrame);
    return actions;
  }

  /**
   * Parse a single action from the command stream
   */
  private static parseAction(view: DataView, position: number, frame: number, commandByte: number): RemasteredAction | null {
    try {
      const actionType = this.ACTION_TYPES[commandByte] || `Unknown_0x${commandByte.toString(16)}`;
      const commandLength = this.getCommandLength(commandByte);
      
      // Read command data
      const data = new Uint8Array(commandLength);
      for (let i = 0; i < commandLength && position + i < view.byteLength; i++) {
        data[i] = view.getUint8(position + i);
      }
      
      // Extract player ID (usually the second byte)
      const playerId = commandLength > 1 && position + 1 < view.byteLength ? view.getUint8(position + 1) : 0;
      
      // Parse specific command data based on type
      let unitId, targetX, targetY, supply;
      
      if (commandByte === 0x14 && commandLength >= 6) { // Move command
        targetX = view.getUint16(position + 2, true);
        targetY = view.getUint16(position + 4, true);
      } else if (commandByte === 0x15 && commandLength >= 6) { // Attack command
        targetX = view.getUint16(position + 2, true);
        targetY = view.getUint16(position + 4, true);
      } else if (commandByte === 0x0C && commandLength >= 7) { // Build command
        targetX = view.getUint16(position + 2, true);
        targetY = view.getUint16(position + 4, true);
        unitId = view.getUint16(position + 6, true);
      }
      
      const timestamp = this.frameToTimestamp(frame);
      
      return {
        frame,
        playerId,
        actionType,
        actionId: commandByte,
        data,
        timestamp,
        supply,
        unitId,
        targetX,
        targetY
      };
      
    } catch (error) {
      console.warn('[RemasteredActionParser] Error parsing action:', error);
      return null;
    }
  }

  /**
   * Get the length of a command based on its type
   */
  private static getCommandLength(commandByte: number): number {
    const lengths: Record<number, number> = {
      0x09: 2,   // Select
      0x0A: 2,   // Shift Select
      0x0B: 2,   // Shift Deselect
      0x0C: 7,   // Build
      0x0D: 2,   // Vision
      0x0E: 4,   // Alliance
      0x13: 2,   // Hotkey
      0x14: 6,   // Move
      0x15: 6,   // Attack
      0x16: 1,   // Cancel
      0x17: 1,   // Cancel Hatch
      0x18: 1,   // Stop
      0x1D: 2,   // Train
      0x1E: 2,   // Cancel Train
      0x1F: 1,   // Cloak
      0x20: 1,   // Decloak
      0x21: 2,   // Unit Morph
      0x2F: 2,   // Research
      0x30: 2,   // Cancel Research
      0x31: 2,   // Upgrade
      0x32: 2,   // Cancel Upgrade
      0x34: 2    // Building Morph
    };
    
    return lengths[commandByte] || 1;
  }

  /**
   * Group actions by player ID
   */
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

  /**
   * Generate build orders from actions
   */
  private static generateBuildOrders(actions: RemasteredAction[], playerActions: Record<number, RemasteredAction[]>): RemasteredBuildOrder[][] {
    const buildOrders: RemasteredBuildOrder[][] = [];
    
    for (const [playerIdStr, playerActionList] of Object.entries(playerActions)) {
      const playerId = parseInt(playerIdStr);
      const buildOrder: RemasteredBuildOrder[] = [];
      
      for (const action of playerActionList) {
        // Filter for build-related actions
        if (this.isBuildAction(action)) {
          buildOrder.push({
            frame: action.frame,
            timestamp: action.timestamp,
            action: this.getBuildActionDescription(action),
            playerId
          });
        }
      }
      
      // Sort by frame
      buildOrder.sort((a, b) => a.frame - b.frame);
      buildOrders[playerId] = buildOrder;
    }
    
    return buildOrders;
  }

  /**
   * Check if an action is build-related
   */
  private static isBuildAction(action: RemasteredAction): boolean {
    const buildActionIds = [0x0C, 0x1D, 0x21, 0x2F, 0x31, 0x34]; // Build, Train, Morph, Research, Upgrade, Building Morph
    return buildActionIds.includes(action.actionId);
  }

  /**
   * Get a description for a build action
   */
  private static getBuildActionDescription(action: RemasteredAction): string {
    switch (action.actionId) {
      case 0x0C:
        return `Build structure (ID: ${action.unitId || 'unknown'})`;
      case 0x1D:
        return `Train unit (ID: ${action.unitId || 'unknown'})`;
      case 0x21:
        return `Unit morph (ID: ${action.unitId || 'unknown'})`;
      case 0x2F:
        return `Research technology`;
      case 0x31:
        return `Upgrade`;
      case 0x34:
        return `Building morph`;
      default:
        return action.actionType;
    }
  }

  /**
   * Convert frame number to timestamp
   */
  private static frameToTimestamp(frame: number): string {
    const seconds = frame / this.FRAMES_PER_SECOND;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate average game speed from actions
   */
  private static calculateGameSpeed(actions: RemasteredAction[]): number {
    if (actions.length === 0) return 1.0;
    
    // Estimate game speed based on action frequency
    const timespan = actions.length > 0 ? actions[actions.length - 1].frame - actions[0].frame : 0;
    const avgActionsPerFrame = timespan > 0 ? actions.length / timespan : 0;
    
    // Normal game speed is around 1.0, faster speeds have more actions per frame
    return Math.max(0.5, Math.min(2.0, avgActionsPerFrame * 100));
  }
}
