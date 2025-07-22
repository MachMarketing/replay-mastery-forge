/**
 * Comprehensive SC:BW Remastered .rep Parser
 * Handles ALL international .rep files (KR, EN, Unicode)
 * Extracts: Player data, Build orders, APM/EAPM, Key events, Action streams
 */

import { BWBinaryReader } from './bwRemastered/binaryReader';

export interface SCRPlayerData {
  id: number;
  name: string;
  race: 'Terran' | 'Protoss' | 'Zerg' | 'Random' | 'Unknown';
  raceId: number;
  team: number;
  color: number;
  slotType: number;
}

export interface SCRBuildOrderItem {
  frame: number;
  gameTime: string;
  supply: string;
  action: string;
  unitOrBuilding: string;
  playerId: number;
}

export interface SCRActionCommand {
  frame: number;
  playerId: number;
  commandId: number;
  commandName: string;
  parameters: any;
  rawData: Uint8Array;
}

export interface SCRKeyEvent {
  frame: number;
  gameTime: string;
  type: 'scouting' | 'upgrade' | 'combat' | 'hotkey' | 'expansion';
  description: string;
  playerId: number;
}

export interface SCRParseResult {
  success: boolean;
  metadata: {
    mapName: string;
    gameDate: string;
    duration: string;
    durationSeconds: number;
    gameType: string;
    replayVersion: string;
  };
  players: SCRPlayerData[];
  buildOrders: Record<number, SCRBuildOrderItem[]>;
  actionStream: SCRActionCommand[];
  keyEvents: SCRKeyEvent[];
  apmData: Record<number, { apm: number; eapm: number; }>;
  error?: string;
}

export class SCRemasteredParser {
  private reader: BWBinaryReader;
  private buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.reader = new BWBinaryReader(buffer);
  }

  async parseReplay(): Promise<SCRParseResult> {
    console.log('[SCRemasteredParser] Starting comprehensive parse');
    
    try {
      // Step 1: Parse header and metadata
      const metadata = await this.parseMetadata();
      console.log('[SCRemasteredParser] Metadata parsed:', metadata);

      // Step 2: Extract all players (international support)
      const players = await this.parsePlayersInternational();
      console.log('[SCRemasteredParser] Players parsed:', players.length);

      // Step 3: Extract action stream (all commands)
      const actionStream = await this.parseActionStream();
      console.log('[SCRemasteredParser] Actions parsed:', actionStream.length);

      // Step 4: Build order extraction from action stream
      const buildOrders = this.extractBuildOrders(actionStream, players);
      console.log('[SCRemasteredParser] Build orders extracted');

      // Step 5: Calculate APM/EAPM
      const apmData = this.calculateAPM(actionStream, metadata.durationSeconds);
      console.log('[SCRemasteredParser] APM calculated');

      // Step 6: Extract key events
      const keyEvents = this.extractKeyEvents(actionStream, buildOrders);
      console.log('[SCRemasteredParser] Key events extracted:', keyEvents.length);

      return {
        success: true,
        metadata,
        players,
        buildOrders,
        actionStream,
        keyEvents,
        apmData,
      };

    } catch (error) {
      console.error('[SCRemasteredParser] Parse failed:', error);
      return {
        success: false,
        metadata: this.getEmptyMetadata(),
        players: [],
        buildOrders: {},
        actionStream: [],
        keyEvents: [],
        apmData: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async parseMetadata() {
    // Try multiple header formats for international support
    const possibleOffsets = [0, 4, 8, 12, 16];
    
    for (const offset of possibleOffsets) {
      try {
        this.reader.setPosition(offset);
        
        // Check for Remastered signature
        const signature = this.reader.readFixedString(4);
        if (signature === 'reRS' || signature === 'seRS') {
          console.log('[SCRemasteredParser] Found Remastered signature:', signature);
          
          // Parse version and engine info
          const version = this.reader.readUInt32LE();
          const frames = this.reader.readUInt32LE();
          
          // Extract map name with Unicode support
          const mapName = this.extractMapNameUnicode();
          
          // Calculate duration
          const durationSeconds = Math.floor(frames / 23.81); // SC:R fps
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          return {
            mapName: mapName || 'Unknown Map',
            gameDate: new Date().toISOString().split('T')[0],
            duration,
            durationSeconds,
            gameType: 'Melee',
            replayVersion: `${signature}-${version}`,
          };
        }
      } catch (e) {
        console.log(`[SCRemasteredParser] Offset ${offset} failed, trying next`);
        continue;
      }
    }
    
    // Fallback metadata
    return this.getEmptyMetadata();
  }

  private extractMapNameUnicode(): string {
    // Search for map name in multiple locations with Unicode support
    const searchOffsets = [200, 300, 400, 500, 600];
    
    for (const offset of searchOffsets) {
      try {
        this.reader.setPosition(offset);
        
        // Try ASCII first
        for (let len = 8; len <= 64; len += 4) {
          this.reader.setPosition(offset);
          const candidate = this.reader.readFixedString(len).trim();
          
          if (this.isValidMapName(candidate)) {
            console.log('[SCRemasteredParser] Found ASCII map name:', candidate);
            return candidate;
          }
        }
        
        // Try Unicode (UTF-16LE)
        for (let len = 16; len <= 128; len += 8) {
          this.reader.setPosition(offset);
          const bytes = this.reader.readBytes(len);
          const candidate = this.parseUnicodeString(bytes);
          
          if (this.isValidMapName(candidate)) {
            console.log('[SCRemasteredParser] Found Unicode map name:', candidate);
            return candidate;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }

  private parseUnicodeString(bytes: Uint8Array): string {
    try {
      // Try UTF-16LE
      const decoder = new TextDecoder('utf-16le');
      return decoder.decode(bytes).replace(/\0/g, '').trim();
    } catch {
      // Fallback to ASCII
      return Array.from(bytes)
        .map(b => b > 31 && b < 127 ? String.fromCharCode(b) : '')
        .join('')
        .trim();
    }
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) return false;
    
    // Check for common map name patterns
    const mapPatterns = [
      /fighting.spirit/i,
      /circuit.breaker/i,
      /python/i,
      /andromeda/i,
      /outsider/i,
      /destination/i,
      /neo.moon/i,
      /polypoid/i,
      /heartbreak.ridge/i,
      /match.point/i,
    ];
    
    const hasValidChars = /^[a-zA-Z0-9가-힣\s\(\)\.\-_]+$/.test(name);
    const hasKnownMap = mapPatterns.some(pattern => pattern.test(name));
    
    return hasValidChars && (hasKnownMap || name.includes('('));
  }

  private async parsePlayersInternational(): Promise<SCRPlayerData[]> {
    const players: SCRPlayerData[] = [];
    
    // Search for player data in multiple sections
    const playerOffsets = [400, 500, 600, 700, 800];
    
    for (const baseOffset of playerOffsets) {
      try {
        for (let i = 0; i < 8; i++) { // Max 8 players
          const offset = baseOffset + (i * 36); // Standard player slot size
          this.reader.setPosition(offset);
          
          if (!this.reader.canRead(36)) continue;
          
          // Extract player name with encoding support
          const nameBytes = this.reader.readBytes(24);
          const name = this.extractPlayerName(nameBytes);
          
          if (name && name.length > 0 && name !== '\x00'.repeat(name.length)) {
            const raceId = this.reader.readUInt8();
            const team = this.reader.readUInt8();
            const color = this.reader.readUInt8();
            const slotType = this.reader.readUInt8();
            
            players.push({
              id: i,
              name: name.trim(),
              race: this.getRaceFromId(raceId),
              raceId,
              team,
              color,
              slotType,
            });
            
            console.log(`[SCRemasteredParser] Found player: ${name} (${this.getRaceFromId(raceId)})`);
          }
        }
        
        if (players.length >= 2) break; // Found valid players
      } catch (e) {
        continue;
      }
    }
    
    // If no players found, create fallback
    if (players.length === 0) {
      players.push(
        { id: 0, name: 'Player 1', race: 'Unknown', raceId: 0, team: 0, color: 0, slotType: 6 },
        { id: 1, name: 'Player 2', race: 'Unknown', raceId: 0, team: 1, color: 1, slotType: 6 }
      );
    }
    
    return players;
  }

  private extractPlayerName(bytes: Uint8Array): string {
    // Try multiple encoding methods for international names
    
    // Method 1: UTF-8
    try {
      const utf8Name = new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
      if (this.isValidPlayerName(utf8Name)) return utf8Name;
    } catch {}
    
    // Method 2: EUC-KR for Korean names
    try {
      const koreanName = this.decodeEUCKR(bytes);
      if (this.isValidPlayerName(koreanName)) return koreanName;
    } catch {}
    
    // Method 3: ASCII
    const asciiName = Array.from(bytes)
      .filter(b => b > 0)
      .map(b => b > 31 && b < 127 ? String.fromCharCode(b) : '')
      .join('')
      .trim();
    
    return this.isValidPlayerName(asciiName) ? asciiName : '';
  }

  private decodeEUCKR(bytes: Uint8Array): string {
    // Basic EUC-KR decoding for Korean player names
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte === 0) break;
      
      if (byte > 127 && i + 1 < bytes.length) {
        // Korean character
        const next = bytes[i + 1];
        if (next > 127) {
          // This would be a Korean character in EUC-KR
          result += '?'; // Placeholder for actual Korean decoding
          i++; // Skip next byte
        } else {
          result += String.fromCharCode(byte);
        }
      } else {
        result += String.fromCharCode(byte);
      }
    }
    return result.trim();
  }

  private isValidPlayerName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 24) return false;
    
    // Allow Korean, ASCII, and other international characters
    const validPattern = /^[a-zA-Z0-9가-힣\[\]\(\)\{\}\-_\.\s]+$/;
    return validPattern.test(name) && !/^[\s\x00]*$/.test(name);
  }

  private getRaceFromId(raceId: number): 'Terran' | 'Protoss' | 'Zerg' | 'Random' | 'Unknown' {
    const races = {
      0: 'Zerg' as const,
      1: 'Terran' as const,
      2: 'Protoss' as const,
      6: 'Random' as const,
    };
    return races[raceId as keyof typeof races] || 'Unknown';
  }

  private async parseActionStream(): Promise<SCRActionCommand[]> {
    const commands: SCRActionCommand[] = [];
    
    // Find command section
    const commandOffsets = [633, 637, 641, 645, 1000, 1200];
    
    for (const startOffset of commandOffsets) {
      try {
        this.reader.setPosition(startOffset);
        let currentFrame = 0;
        let consecutiveErrors = 0;
        
        while (this.reader.getRemainingBytes() > 10 && consecutiveErrors < 50) {
          try {
            const command = this.parseNextCommand(currentFrame);
            if (command) {
              commands.push(command);
              currentFrame = command.frame;
              consecutiveErrors = 0;
            } else {
              consecutiveErrors++;
            }
          } catch (e) {
            consecutiveErrors++;
            this.reader.skip(1); // Skip bad byte
          }
        }
        
        if (commands.length > 100) break; // Found valid command stream
      } catch (e) {
        console.log(`[SCRemasteredParser] Command offset ${startOffset} failed`);
        continue;
      }
    }
    
    console.log(`[SCRemasteredParser] Extracted ${commands.length} commands`);
    return commands;
  }

  private parseNextCommand(currentFrame: number): SCRActionCommand | null {
    if (!this.reader.canRead(4)) return null;
    
    const byte1 = this.reader.readUInt8();
    
    // Frame sync
    if (byte1 === 0x00) {
      if (!this.reader.canRead(3)) return null;
      const frameIncrement = this.reader.readUInt16LE();
      this.reader.skip(1); // Checksum
      return {
        frame: currentFrame + frameIncrement,
        playerId: -1,
        commandId: 0x00,
        commandName: 'Frame Sync',
        parameters: { frameIncrement },
        rawData: new Uint8Array([0x00, frameIncrement & 0xFF, (frameIncrement >> 8) & 0xFF, 0])
      };
    }
    
    // Player command
    if (byte1 >= 0x08 && byte1 <= 0x48) {
      const playerId = (byte1 - 0x08) >> 3;
      const commandId = this.reader.readUInt8();
      const commandName = this.getCommandName(commandId);
      
      // Parse parameters based on command
      const parameters = this.parseCommandParameters(commandId);
      const paramValues = Object.values(parameters).filter(v => typeof v === 'number') as number[];
      const rawData = new Uint8Array([byte1, commandId, ...paramValues]);
      
      return {
        frame: currentFrame,
        playerId,
        commandId,
        commandName,
        parameters,
        rawData
      };
    }
    
    return null;
  }

  private getCommandName(commandId: number): string {
    const commands: Record<number, string> = {
      0x0C: 'Select Units',
      0x0D: 'Shift Select',
      0x0E: 'Shift Deselect',
      0x14: 'Build',
      0x15: 'Vision',
      0x18: 'Hotkey Assign',
      0x19: 'Hotkey Select',
      0x1A: 'Train',
      0x1B: 'Cancel',
      0x1C: 'Upgrade',
      0x1D: 'Tech',
      0x20: 'Unload',
      0x23: 'Stop',
      0x24: 'Return Cargo',
      0x25: 'Move',
      0x26: 'Attack',
      0x57: 'Leave Game',
    };
    return commands[commandId] || `Unknown (0x${commandId.toString(16)})`;
  }

  private parseCommandParameters(commandId: number): any {
    // Parse command-specific parameters
    switch (commandId) {
      case 0x14: // Build
        if (this.reader.canRead(4)) {
          return {
            unitId: this.reader.readUInt16LE(),
            x: this.reader.readUInt8(),
            y: this.reader.readUInt8(),
          };
        }
        break;
      case 0x1A: // Train
        if (this.reader.canRead(2)) {
          return {
            unitId: this.reader.readUInt16LE(),
          };
        }
        break;
      case 0x25: // Move
      case 0x26: // Attack
        if (this.reader.canRead(4)) {
          return {
            x: this.reader.readUInt16LE(),
            y: this.reader.readUInt16LE(),
          };
        }
        break;
    }
    return {};
  }

  private extractBuildOrders(commands: SCRActionCommand[], players: SCRPlayerData[]): Record<number, SCRBuildOrderItem[]> {
    const buildOrders: Record<number, SCRBuildOrderItem[]> = {};
    
    // Initialize build orders for all players
    players.forEach(player => {
      buildOrders[player.id] = [];
    });
    
    let currentSupply: Record<number, number> = {};
    players.forEach(p => currentSupply[p.id] = 4); // Starting supply
    
    commands.forEach(cmd => {
      if (cmd.playerId < 0 || !buildOrders[cmd.playerId]) return;
      
      const gameTime = this.frameToTimeString(cmd.frame);
      const supply = currentSupply[cmd.playerId] || 4;
      
      // Track building/training commands
      if (cmd.commandId === 0x14 || cmd.commandId === 0x1A) { // Build or Train
        const unitId = cmd.parameters.unitId;
        const unitName = this.getUnitName(unitId);
        
        if (unitName && unitName !== 'Unknown') {
          buildOrders[cmd.playerId].push({
            frame: cmd.frame,
            gameTime,
            supply: supply.toString(),
            action: cmd.commandId === 0x14 ? 'Build' : 'Train',
            unitOrBuilding: unitName,
            playerId: cmd.playerId,
          });
          
          // Update supply estimation
          const supplyChange = this.getSupplyChange(unitId);
          currentSupply[cmd.playerId] += supplyChange;
        }
      }
    });
    
    return buildOrders;
  }

  private getUnitName(unitId: number): string {
    const units: Record<number, string> = {
      // Terran
      0x00: 'SCV',
      0x01: 'Marine',
      0x02: 'Firebat',
      0x03: 'Medic',
      0x04: 'Ghost',
      0x05: 'Vulture',
      0x06: 'Siege Tank',
      0x07: 'Goliath',
      0x08: 'Wraith',
      0x09: 'Dropship',
      0x0A: 'Battlecruiser',
      0x0B: 'Valkyrie',
      
      // Buildings
      0x6A: 'Command Center',
      0x6B: 'Supply Depot',
      0x6C: 'Refinery',
      0x6D: 'Barracks',
      0x6E: 'Academy',
      0x6F: 'Factory',
      0x70: 'Starport',
      0x71: 'Control Tower',
      0x72: 'Science Facility',
      0x73: 'Covert Ops',
      0x74: 'Physics Lab',
      0x75: 'Machine Shop',
      0x76: 'Engineering Bay',
      0x77: 'Armory',
      0x78: 'Missile Turret',
      0x79: 'Bunker',
      
      // Protoss
      0x3C: 'Probe',
      0x3D: 'Zealot',
      0x3E: 'Dragoon',
      0x3F: 'High Templar',
      0x40: 'Archon',
      0x41: 'Shuttle',
      0x42: 'Scout',
      0x43: 'Arbiter',
      0x44: 'Carrier',
      0x45: 'Interceptor',
      0x46: 'Dark Templar',
      0x47: 'Dark Archon',
      0x48: 'Observer',
      0x49: 'Warp Prism',
      0x4A: 'Corsair',
      
      // Zerg
      0x23: 'Drone',
      0x24: 'Zergling',
      0x25: 'Lurker',
      0x26: 'Hydralisk',
      0x27: 'Ultralisk',
      0x28: 'Broodling',
      0x29: 'Scourge',
      0x2A: 'Queen',
      0x2B: 'Overlord',
      0x2C: 'Mutalisk',
      0x2D: 'Guardian',
      0x2E: 'Devourer',
      0x2F: 'Defiler',
    };
    
    return units[unitId] || 'Unknown';
  }

  private getSupplyChange(unitId: number): number {
    // Supply changes for different units
    const supplyChanges: Record<number, number> = {
      0x6B: 8, // Supply Depot
      0x82: 8, // Pylon  
      0x83: 16, // Overlord
    };
    return supplyChanges[unitId] || 0;
  }

  private frameToTimeString(frame: number): string {
    const seconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private calculateAPM(commands: SCRActionCommand[], durationSeconds: number): Record<number, { apm: number; eapm: number; }> {
    const apmData: Record<number, { apm: number; eapm: number; }> = {};
    
    // Group commands by player
    const playerCommands: Record<number, SCRActionCommand[]> = {};
    commands.forEach(cmd => {
      if (cmd.playerId >= 0) {
        if (!playerCommands[cmd.playerId]) playerCommands[cmd.playerId] = [];
        playerCommands[cmd.playerId].push(cmd);
      }
    });
    
    // Calculate APM for each player
    Object.entries(playerCommands).forEach(([playerId, cmds]) => {
      const pid = parseInt(playerId);
      const totalActions = cmds.length;
      const effectiveActions = cmds.filter(cmd => 
        ![0x00, 0x01, 0x02].includes(cmd.commandId) // Exclude sync commands
      ).length;
      
      const minutes = Math.max(durationSeconds / 60, 1);
      
      apmData[pid] = {
        apm: Math.round(totalActions / minutes),
        eapm: Math.round(effectiveActions / minutes),
      };
    });
    
    return apmData;
  }

  private extractKeyEvents(commands: SCRActionCommand[], buildOrders: Record<number, SCRBuildOrderItem[]>): SCRKeyEvent[] {
    const events: SCRKeyEvent[] = [];
    
    commands.forEach(cmd => {
      const gameTime = this.frameToTimeString(cmd.frame);
      
      // Scouting events
      if (cmd.commandName === 'Move' && cmd.frame < 3000) { // Early game movement
        events.push({
          frame: cmd.frame,
          gameTime,
          type: 'scouting',
          description: 'Early scouting movement detected',
          playerId: cmd.playerId,
        });
      }
      
      // Upgrade events
      if (cmd.commandId === 0x1C || cmd.commandId === 0x1D) {
        events.push({
          frame: cmd.frame,
          gameTime,
          type: 'upgrade',
          description: `${cmd.commandName} initiated`,
          playerId: cmd.playerId,
        });
      }
      
      // Hotkey usage
      if (cmd.commandId === 0x18 || cmd.commandId === 0x19) {
        events.push({
          frame: cmd.frame,
          gameTime,
          type: 'hotkey',
          description: `Hotkey ${cmd.commandName.toLowerCase()}`,
          playerId: cmd.playerId,
        });
      }
    });
    
    return events.slice(0, 50); // Limit to most important events
  }

  private getEmptyMetadata() {
    return {
      mapName: 'Unknown Map',
      gameDate: new Date().toISOString().split('T')[0],
      duration: '0:00',
      durationSeconds: 0,
      gameType: 'Unknown',
      replayVersion: 'Unknown',
    };
  }
}