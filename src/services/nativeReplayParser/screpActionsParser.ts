
/**
 * Actions parser for StarCraft replay data
 * Based on screp actions specification
 */

export interface ScrepAction {
  frame: number;
  playerId: number;
  actionId: number;
  actionName: string;
  isGameAction: boolean;
  data: Uint8Array;
}

export class ScrepActionsParser {
  private data: Uint8Array;
  private position: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Parse actions from command data section
   */
  parseActions(startOffset: number, maxFrames: number): ScrepAction[] {
    console.log('[ScrepActionsParser] Parsing actions from offset:', startOffset);
    
    this.position = startOffset;
    const actions: ScrepAction[] = [];
    let currentFrame = 0;

    // Action definitions based on screp specification
    const actionDefs = {
      0x09: { name: 'Select', gameAction: true, length: 2 },
      0x0A: { name: 'Shift Select', gameAction: false, length: 2 },
      0x0B: { name: 'Shift Deselect', gameAction: false, length: 2 },
      0x0C: { name: 'Build', gameAction: true, length: 7 },
      0x0D: { name: 'Vision', gameAction: false, length: 2 },
      0x0E: { name: 'Alliance', gameAction: true, length: 4 },
      0x13: { name: 'Hotkey', gameAction: false, length: 2 },
      0x14: { name: 'Move', gameAction: true, length: 4 },
      0x15: { name: 'Attack', gameAction: true, length: 6 },
      0x18: { name: 'Stop', gameAction: true, length: 1 },
      0x1A: { name: 'Return Cargo', gameAction: true, length: 1 },
      0x1D: { name: 'Train', gameAction: true, length: 2 },
      0x1E: { name: 'Cancel Train', gameAction: true, length: 2 },
      0x2F: { name: 'Research', gameAction: true, length: 2 },
      0x30: { name: 'Cancel Research', gameAction: true, length: 2 },
      0x31: { name: 'Upgrade', gameAction: true, length: 2 },
      0x32: { name: 'Cancel Upgrade', gameAction: true, length: 2 }
    };

    while (this.position < this.data.length - 1 && currentFrame < maxFrames) {
      const actionId = this.data[this.position];

      // Handle frame advancement
      if (actionId === 0x00) {
        currentFrame++;
        this.position++;
        continue;
      }

      // Handle frame skips
      if (actionId === 0x01) {
        const skip = this.data[this.position + 1] || 1;
        currentFrame += skip;
        this.position += 2;
        continue;
      }

      if (actionId === 0x02) {
        const skip = this.readUint16LE(this.position + 1);
        currentFrame += skip;
        this.position += 3;
        continue;
      }

      // Parse known action
      if (actionId in actionDefs) {
        const actionDef = actionDefs[actionId as keyof typeof actionDefs];
        const startPos = this.position;
        
        // Read action data
        const actionData = this.data.slice(startPos, Math.min(startPos + actionDef.length, this.data.length));
        
        // Get player ID (usually second byte)
        const playerId = actionData.length > 1 ? actionData[1] : 0;

        actions.push({
          frame: currentFrame,
          playerId,
          actionId,
          actionName: actionDef.name,
          isGameAction: actionDef.gameAction,
          data: actionData
        });

        this.position = startPos + actionDef.length;
      } else {
        // Skip unknown byte
        this.position++;
      }

      // Safety break
      if (actions.length > 10000) break;
    }

    console.log('[ScrepActionsParser] Parsed actions:', actions.length);
    return actions;
  }

  /**
   * Find the start of command data section
   */
  findCommandsStart(): number {
    // Commands typically start at offset 633 (0x279) for Remastered
    const commonOffsets = [633, 637, 641, 645];
    
    for (const offset of commonOffsets) {
      if (this.isValidCommandStart(offset)) {
        console.log('[ScrepActionsParser] Found commands at offset:', offset);
        return offset;
      }
    }
    
    console.warn('[ScrepActionsParser] Using default command offset');
    return 633;
  }

  private isValidCommandStart(offset: number): boolean {
    if (offset >= this.data.length - 50) return false;
    
    let validActions = 0;
    let frameMarkers = 0;
    
    for (let i = 0; i < 50 && offset + i < this.data.length; i++) {
      const byte = this.data[offset + i];
      
      if (byte === 0x00) frameMarkers++;
      if ([0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x13, 0x14, 0x15, 0x18, 0x1D, 0x1E].includes(byte)) {
        validActions++;
      }
    }
    
    return validActions >= 3 && frameMarkers >= 5;
  }

  private readUint16LE(offset: number): number {
    if (offset + 1 >= this.data.length) return 0;
    return this.data[offset] | (this.data[offset + 1] << 8);
  }
}
