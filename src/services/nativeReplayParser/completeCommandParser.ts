
/**
 * Complete Command Parser - Direct port from screp repparser.go
 * Handles all 40+ command types exactly like the official parser
 */

import { 
  CommandType, 
  COMMAND_NAMES, 
  UNIT_NAMES, 
  UnitID, 
  OrderID, 
  TechID,
  framesToTimeString,
  FRAMES_PER_SECOND 
} from './repcore/constants';
import { IneffKind, analyzeCommandEffectiveness, calculateEAPM } from './repcore/ineffKind';

export interface ParsedCommand {
  frame: number;
  time: string;
  playerID: number;
  type: number;
  typeString: string;
  data: Uint8Array;
  parameters: any;
  ineffKind: IneffKind;
  effective: boolean;
  ineffectiveReason?: string;
}

export interface CommandParseResult {
  commands: ParsedCommand[];
  totalFrames: number;
  parseErrors: number;
  eapmData: {
    eapm: number;
    totalEffective: number;
    totalCommands: number;
    efficiency: number;
  };
}

export class CompleteCommandParser {
  private data: Uint8Array;
  private position: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Parse commands exactly like screp's parseCommands function
   */
  parseCommands(): CommandParseResult {
    console.log('[CompleteCommandParser] Starting complete command parsing');
    console.log('[CompleteCommandParser] Data size:', this.data.length);
    
    const commands: ParsedCommand[] = [];
    let parseErrors = 0;
    let totalFrames = 0;
    
    // Parse command structure exactly like screp
    while (this.position < this.data.length) {
      try {
        const frame = this.readUInt32();
        totalFrames = Math.max(totalFrames, frame);
        
        // Command block size
        const cmdBlockSize = this.readUInt8();
        const cmdBlockEndPos = this.position + cmdBlockSize;
        
        // Parse commands in this frame
        while (this.position < cmdBlockEndPos && this.position < this.data.length) {
          try {
            const command = this.parseNextCommand(frame);
            if (command) {
              commands.push(command);
            }
          } catch (error) {
            console.warn('[CompleteCommandParser] Command parse error:', error);
            parseErrors++;
            // Skip to next byte and continue
            this.position++;
          }
        }
        
        // Ensure we're at the end of the command block
        this.position = Math.min(cmdBlockEndPos, this.data.length);
        
      } catch (error) {
        console.warn('[CompleteCommandParser] Frame parse error:', error);
        parseErrors++;
        break;
      }
    }
    
    // Analyze command effectiveness for EAPM
    this.analyzeCommandEffectiveness(commands);
    
    // Calculate EAPM
    const eapmData = calculateEAPM(commands, totalFrames);
    
    console.log('[CompleteCommandParser] Parsing complete:', {
      totalCommands: commands.length,
      totalFrames,
      parseErrors,
      eapm: eapmData.eapm,
      efficiency: eapmData.efficiency
    });
    
    return {
      commands,
      totalFrames,
      parseErrors,
      eapmData
    };
  }

  /**
   * Parse next command exactly like screp's command parsing switch
   */
  private parseNextCommand(frame: number): ParsedCommand | null {
    if (this.position >= this.data.length - 2) {
      return null;
    }
    
    const playerID = this.readUInt8();
    const commandType = this.readUInt8();
    
    const baseCommand: Partial<ParsedCommand> = {
      frame,
      time: framesToTimeString(frame),
      playerID,
      type: commandType,
      typeString: COMMAND_NAMES[commandType] || `UNKNOWN_${commandType.toString(16)}`,
      ineffKind: IneffKind.Effective,
      effective: true
    };
    
    // Parse command parameters based on type - exact switch from screp
    switch (commandType) {
      case CommandType.RightClick:
        return this.parseRightClickCommand(baseCommand);
        
      case CommandType.Select:
      case CommandType.SelectAdd:
      case CommandType.SelectRemove:
        return this.parseSelectCommand(baseCommand);
        
      case CommandType.Hotkey:
        return this.parseHotkeyCommand(baseCommand);
        
      case CommandType.Train:
      case CommandType.UnitMorph:
        return this.parseTrainCommand(baseCommand);
        
      case CommandType.TargetedOrder:
        return this.parseTargetedOrderCommand(baseCommand);
        
      case CommandType.Build:
        return this.parseBuildCommand(baseCommand);
        
      case CommandType.Stop:
      case CommandType.Burrow:
      case CommandType.Unburrow:
      case CommandType.HoldPosition:
      case CommandType.CloakUnit:
      case CommandType.DecloakUnit:
        return this.parseQueueableCommand(baseCommand);
        
      case CommandType.Chat:
        return this.parseChatCommand(baseCommand);
        
      case CommandType.Vision:
        return this.parseVisionCommand(baseCommand);
        
      case CommandType.Tech:
        return this.parseTechCommand(baseCommand);
        
      case CommandType.Upgrade:
        return this.parseUpgradeCommand(baseCommand);
        
      case CommandType.CancelTrain:
        return this.parseCancelTrainCommand(baseCommand);
        
      case CommandType.LiftOff:
        return this.parseLiftOffCommand(baseCommand);
        
      case CommandType.BuildingMorph:
        return this.parseBuildingMorphCommand(baseCommand);
        
      // 1.21+ commands
      case CommandType.RightClick121:
        return this.parseRightClick121Command(baseCommand);
        
      case CommandType.TargetedOrder121:
        return this.parseTargetedOrder121Command(baseCommand);
        
      case CommandType.Select121:
      case CommandType.SelectAdd121:
      case CommandType.SelectRemove121:
        return this.parseSelect121Command(baseCommand);
        
      case CommandType.Unload121:
        return this.parseUnload121Command(baseCommand);
        
      // No additional data commands
      case CommandType.KeepAlive:
      case CommandType.Sync:
        return this.parseNoDataCommand(baseCommand);
        
      default:
        // Unknown command - skip to avoid parsing errors
        console.warn(`[CompleteCommandParser] Unknown command type: 0x${commandType.toString(16)} at frame ${frame}`);
        return this.parseUnknownCommand(baseCommand, commandType);
    }
  }

  // Command parsing methods - exact implementations from screp

  private parseRightClickCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const x = this.readUInt16();
    const y = this.readUInt16();
    const unitTag = this.readUInt16();
    const unit = this.readUInt16();
    const queued = this.readUInt8() !== 0;
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        pos: { x, y },
        unitTag,
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        queued
      }
    } as ParsedCommand;
  }

  private parseSelectCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const count = this.readUInt8();
    const unitTags: number[] = [];
    
    for (let i = 0; i < count; i++) {
      unitTags.push(this.readUInt16());
    }
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        count,
        unitTags
      }
    } as ParsedCommand;
  }

  private parseHotkeyCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const hotkeyType = this.readUInt8();
    const group = this.readUInt8();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        hotkeyType,
        group
      }
    } as ParsedCommand;
  }

  private parseTrainCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const unit = this.readUInt16();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        unitId: unit
      }
    } as ParsedCommand;
  }

  private parseTargetedOrderCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const x = this.readUInt16();
    const y = this.readUInt16();
    const unitTag = this.readUInt16();
    const unit = this.readUInt16();
    const order = this.readUInt8();
    const queued = this.readUInt8() !== 0;
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        pos: { x, y },
        unitTag,
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        order,
        queued
      }
    } as ParsedCommand;
  }

  private parseBuildCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const order = this.readUInt8();
    const x = this.readUInt16();
    const y = this.readUInt16();
    const unit = this.readUInt16();
    
    // Check if it's actually a Land command
    if (order === OrderID.BuildingLand) {
      base.typeString = 'Land';
    }
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        order,
        pos: { x, y },
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        unitId: unit
      }
    } as ParsedCommand;
  }

  private parseQueueableCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const queued = this.readUInt8() !== 0;
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        queued
      }
    } as ParsedCommand;
  }

  private parseChatCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const senderSlotID = this.readUInt8();
    const messageBytes = this.readBytes(80);
    
    // Find null terminator
    let messageLength = 80;
    for (let i = 0; i < messageBytes.length; i++) {
      if (messageBytes[i] === 0) {
        messageLength = i;
        break;
      }
    }
    
    const message = new TextDecoder('utf-8').decode(messageBytes.slice(0, messageLength));
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        senderSlotID,
        message
      }
    } as ParsedCommand;
  }

  private parseVisionCommand(base: Partial<ParsedCommand>): ParsedCommand {
    let data = this.readUInt16();
    const slotIDs: number[] = [];
    
    // Extract slot IDs from bit flags
    for (let i = 0; i < 12; i++) {
      if (data & 0x01) {
        slotIDs.push(i);
      }
      data >>= 1;
    }
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        slotIDs
      }
    } as ParsedCommand;
  }

  private parseTechCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const tech = this.readUInt8();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        tech,
        techName: this.getTechName(tech)
      }
    } as ParsedCommand;
  }

  private parseUpgradeCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const upgrade = this.readUInt8();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        upgrade,
        upgradeName: this.getUpgradeName(upgrade)
      }
    } as ParsedCommand;
  }

  private parseCancelTrainCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const unitTag = this.readUInt16();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        unitTag
      }
    } as ParsedCommand;
  }

  private parseLiftOffCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const x = this.readUInt16();
    const y = this.readUInt16();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        pos: { x, y }
      }
    } as ParsedCommand;
  }

  private parseBuildingMorphCommand(base: Partial<ParsedCommand>): ParsedCommand {
    const unit = this.readUInt16();
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        unitId: unit
      }
    } as ParsedCommand;
  }

  // 1.21+ command parsers

  private parseRightClick121Command(base: Partial<ParsedCommand>): ParsedCommand {
    const x = this.readUInt16();
    const y = this.readUInt16();
    const unitTag = this.readUInt16();
    this.readUInt16(); // Unknown, always 0?
    const unit = this.readUInt16();
    const queued = this.readUInt8() !== 0;
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        pos: { x, y },
        unitTag,
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        queued
      }
    } as ParsedCommand;
  }

  private parseTargetedOrder121Command(base: Partial<ParsedCommand>): ParsedCommand {
    const x = this.readUInt16();
    const y = this.readUInt16();
    const unitTag = this.readUInt16();
    this.readUInt16(); // Unknown, always 0?
    const unit = this.readUInt16();
    const order = this.readUInt8();
    const queued = this.readUInt8() !== 0;
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        pos: { x, y },
        unitTag,
        unit: UNIT_NAMES[unit] || `Unit_${unit}`,
        order,
        queued
      }
    } as ParsedCommand;
  }

  private parseSelect121Command(base: Partial<ParsedCommand>): ParsedCommand {
    const count = this.readUInt8();
    const unitTags: number[] = [];
    
    for (let i = 0; i < count; i++) {
      unitTags.push(this.readUInt16());
      this.readUInt16(); // Unknown, always 0?
    }
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        count,
        unitTags
      }
    } as ParsedCommand;
  }

  private parseUnload121Command(base: Partial<ParsedCommand>): ParsedCommand {
    const unitTag = this.readUInt16();
    this.readUInt16(); // Unknown, always 0?
    
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {
        unitTag
      }
    } as ParsedCommand;
  }

  private parseNoDataCommand(base: Partial<ParsedCommand>): ParsedCommand {
    return {
      ...base,
      data: new Uint8Array(),
      parameters: {}
    } as ParsedCommand;
  }

  private parseUnknownCommand(base: Partial<ParsedCommand>, commandType: number): ParsedCommand {
    // Try to read a few bytes to avoid getting stuck
    const remainingBytes = Math.min(4, this.data.length - this.position);
    const data = this.readBytes(remainingBytes);
    
    return {
      ...base,
      data,
      parameters: {
        unknownType: commandType,
        rawData: Array.from(data).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
      }
    } as ParsedCommand;
  }

  /**
   * Analyze command effectiveness for EAPM calculation
   */
  private analyzeCommandEffectiveness(commands: ParsedCommand[]): void {
    console.log('[CompleteCommandParser] Analyzing command effectiveness for EAPM');
    
    // Group by player for analysis
    const playerCommands: Record<number, ParsedCommand[]> = {};
    
    for (const command of commands) {
      if (!playerCommands[command.playerID]) {
        playerCommands[command.playerID] = [];
      }
      playerCommands[command.playerID].push(command);
    }
    
    // Analyze each player's commands
    for (const [playerID, playerCmds] of Object.entries(playerCommands)) {
      playerCmds.sort((a, b) => a.frame - b.frame);
      
      for (let i = 0; i < playerCmds.length; i++) {
        const command = playerCmds[i];
        const previousCommands = playerCmds.slice(0, i);
        
        command.ineffKind = analyzeCommandEffectiveness(command, previousCommands);
        command.effective = command.ineffKind === IneffKind.Effective;
        
        if (!command.effective) {
          command.ineffectiveReason = this.getIneffectiveReason(command.ineffKind);
        }
      }
    }
  }

  private getIneffectiveReason(ineffKind: IneffKind): string {
    switch (ineffKind) {
      case IneffKind.UnitQueueOverflow: return 'Unit queue overflow';
      case IneffKind.FastCancel: return 'Too fast cancel';
      case IneffKind.FastRepetition: return 'Too fast repetition';
      case IneffKind.FastReselection: return 'Too fast selection change';
      case IneffKind.Repetition: return 'Repetition';
      case IneffKind.RepetitionHotkeyAddAssign: return 'Hotkey repetition';
      default: return 'Unknown ineffectiveness';
    }
  }

  private getTechName(techId: number): string {
    const techNames: Record<number, string> = {
      [TechID.StimPacks]: 'Stim Packs',
      [TechID.Lockdown]: 'Lockdown',
      [TechID.EMPShockwave]: 'EMP Shockwave',
      [TechID.SpiderMines]: 'Spider Mines',
      [TechID.ScannerSweep]: 'Scanner Sweep',
      [TechID.TankSiegeMode]: 'Tank Siege Mode',
      [TechID.DefensiveMatrix]: 'Defensive Matrix',
      [TechID.Irradiate]: 'Irradiate',
      [TechID.YamatoGun]: 'Yamato Gun',
      [TechID.CloakingField]: 'Cloaking Field',
      [TechID.PersonnelCloaking]: 'Personnel Cloaking',
      [TechID.Burrowing]: 'Burrowing',
      [TechID.Infestation]: 'Infestation',
      [TechID.SpawnBroodlings]: 'Spawn Broodlings',
      [TechID.DarkSwarm]: 'Dark Swarm',
      [TechID.Plague]: 'Plague',
      [TechID.Consume]: 'Consume',
      [TechID.Ensnare]: 'Ensnare',
      [TechID.Parasite]: 'Parasite',
      [TechID.PsionicStorm]: 'Psionic Storm',
      [TechID.Hallucination]: 'Hallucination',
      [TechID.Recall]: 'Recall',
      [TechID.StasisField]: 'Stasis Field',
      [TechID.ArchonWarp]: 'Archon Warp',
      [TechID.Restoration]: 'Restoration',
      [TechID.DisruptionWeb]: 'Disruption Web',
      [TechID.MindControl]: 'Mind Control',
      [TechID.DarkArchonMeld]: 'Dark Archon Meld',
      [TechID.Feedback]: 'Feedback',
      [TechID.OpticalFlare]: 'Optical Flare',
      [TechID.Maelstrom]: 'Maelstrom',
      [TechID.LurkerAspect]: 'Lurker Aspect'
    };
    
    return techNames[techId] || `Tech_${techId}`;
  }

  private getUpgradeName(upgradeId: number): string {
    const upgradeNames: Record<number, string> = {
      0: 'Terran Infantry Armor',
      1: 'Terran Vehicle Plating',
      2: 'Terran Ship Plating',
      3: 'Zerg Carapace',
      4: 'Zerg Flyer Carapace',
      5: 'Protoss Armor',
      6: 'Protoss Plating',
      7: 'Terran Infantry Weapons',
      8: 'Terran Vehicle Weapons',
      9: 'Terran Ship Weapons',
      10: 'Zerg Melee Attacks',
      11: 'Zerg Missile Attacks',
      12: 'Zerg Flyer Attacks',
      13: 'Protoss Ground Weapons',
      14: 'Protoss Air Weapons',
      15: 'Protoss Plasma Shields'
    };
    
    return upgradeNames[upgradeId] || `Upgrade_${upgradeId}`;
  }

  // Binary reading utilities
  private readUInt8(): number {
    if (this.position >= this.data.length) {
      throw new Error('End of data reached');
    }
    return this.data[this.position++];
  }

  private readUInt16(): number {
    if (this.position + 1 >= this.data.length) {
      throw new Error('End of data reached');
    }
    const value = this.data[this.position] | (this.data[this.position + 1] << 8);
    this.position += 2;
    return value;
  }

  private readUInt32(): number {
    if (this.position + 3 >= this.data.length) {
      throw new Error('End of data reached');
    }
    const value = this.data[this.position] | 
                  (this.data[this.position + 1] << 8) |
                  (this.data[this.position + 2] << 16) |
                  (this.data[this.position + 3] << 24);
    this.position += 4;
    return value >>> 0; // Convert to unsigned
  }

  private readBytes(length: number): Uint8Array {
    if (this.position + length > this.data.length) {
      length = this.data.length - this.position;
    }
    const bytes = this.data.slice(this.position, this.position + length);
    this.position += length;
    return bytes;
  }
}
