
/**
 * Section-based Parser - Replicates screp's section architecture
 * Handles all 5 standard sections + modern sections exactly like screp
 */

import { RepFormat, FRAMES_PER_SECOND, framesToTimeString } from './repcore/constants';
import { EnhancedFormatDetector } from './enhancedFormatDetector';

export interface ParsedSection {
  id: number;
  name: string;
  size: number;
  data: Uint8Array;
  compressed: boolean;
  checksum?: number;
}

export interface ReplayHeader {
  engine: number;
  frames: number;
  startTime: Date;
  title: string;
  mapWidth: number;
  mapHeight: number;
  availSlotsCount: number;
  speed: number;
  type: number;
  subType: number;
  host: string;
  map: string;
  players: PlayerSlot[];
}

export interface PlayerSlot {
  slotId: number;
  id: number;
  type: number;
  race: number;
  team: number;
  name: string;
  color: string;
}

export interface ParsedReplay {
  format: RepFormat;
  header: ReplayHeader;
  sections: ParsedSection[];
  commands: any[];
  mapData?: any;
  playerNames?: string[];
  modernSections?: Record<string, any>;
}

export class SectionBasedParser {
  private data: Uint8Array;
  private position: number = 0;
  private format: RepFormat;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
    
    // Detect format exactly like screp
    const formatResult = EnhancedFormatDetector.detectFormat(this.data.slice(0, 30));
    this.format = formatResult.format;
    
    console.log('[SectionBasedParser] Detected format:', formatResult);
  }

  /**
   * Parse complete replay exactly like screp's parse() function
   */
  async parseReplay(): Promise<ParsedReplay> {
    console.log('[SectionBasedParser] Starting section-based parsing');
    console.log('[SectionBasedParser] Format:', this.format);
    
    const sections: ParsedSection[] = [];
    const modernSections: Record<string, any> = {};
    
    let sectionCounter = 0;
    let header: ReplayHeader | null = null;
    let commands: any[] = [];
    let mapData: any = null;
    let playerNames: string[] = [];

    // Parse standard sections (exactly like screp's Sections array)
    const standardSections = [
      { id: 0, size: 0x04, name: 'ReplayID' },
      { id: 1, size: 0x279, name: 'Header' },
      { id: 2, size: 0, name: 'Commands' },
      { id: 3, size: 0, name: 'MapData' },
      { id: 4, size: 0x300, name: 'PlayerNames' }
    ];

    // Parse each section
    for (const sectionDef of standardSections) {
      try {
        const section = await this.parseSection(sectionDef, sectionCounter);
        sections.push(section);
        
        // Process section data based on type
        switch (sectionDef.name) {
          case 'ReplayID':
            await this.validateReplayId(section.data);
            break;
          case 'Header':
            header = await this.parseHeaderSection(section.data);
            break;
          case 'Commands':
            commands = await this.parseCommandsSection(section.data);
            break;
          case 'MapData':
            mapData = await this.parseMapDataSection(section.data);
            break;
          case 'PlayerNames':
            playerNames = await this.parsePlayerNamesSection(section.data);
            break;
        }
        
        sectionCounter++;
      } catch (error) {
        console.warn(`[SectionBasedParser] Failed to parse section ${sectionDef.name}:`, error);
      }
    }

    // Parse modern sections if available (from screp's ModernSections map)
    if (this.format === RepFormat.Modern || this.format === RepFormat.Modern121) {
      await this.parseModernSections(modernSections);
    }

    if (!header) {
      throw new Error('Failed to parse replay header');
    }

    return {
      format: this.format,
      header,
      sections,
      commands,
      mapData,
      playerNames,
      modernSections
    };
  }

  /**
   * Parse individual section with proper decompression
   */
  private async parseSection(sectionDef: any, sectionCounter: number): Promise<ParsedSection> {
    console.log(`[SectionBasedParser] Parsing section ${sectionCounter}: ${sectionDef.name}`);
    
    // Handle inter-section logic for Modern 1.21
    if (this.format === RepFormat.Modern121 && sectionCounter === 1) {
      this.readInt32(); // Skip 4-byte length between sections
    }

    let size = sectionDef.size;
    let sectionId = sectionDef.id;
    
    // For variable size sections, read size first
    if (size === 0) {
      size = this.readInt32();
    }

    let data: Uint8Array;
    let compressed = false;

    if (sectionCounter < 5) {
      // Standard sections
      data = await this.parseStandardSection(size);
    } else {
      // Modern sections
      const modernResult = await this.parseModernSection();
      data = modernResult.data;
      sectionId = modernResult.sectionId;
      compressed = modernResult.compressed;
    }

    return {
      id: sectionId,
      name: sectionDef.name,
      size: data.length,
      data,
      compressed
    };
  }

  /**
   * Parse standard section based on format
   */
  private async parseStandardSection(size: number): Promise<Uint8Array> {
    if (size === 0) {
      return new Uint8Array(0);
    }

    // Read checksum (not validated, just skipped like screp)
    this.readInt32();
    
    // Read chunk count
    const chunkCount = this.readInt32();
    
    if (this.format === RepFormat.Legacy) {
      return this.parseLegacySection(size, chunkCount);
    } else {
      return this.parseModernSection_Standard(size, chunkCount);
    }
  }

  /**
   * Parse legacy section with PKWARE decompression
   */
  private async parseLegacySection(size: number, chunkCount: number): Promise<Uint8Array> {
    console.log(`[SectionBasedParser] Parsing legacy section: ${chunkCount} chunks`);
    
    const result = new Uint8Array(size);
    let resultOffset = 0;
    
    for (let i = 0; i < chunkCount; i++) {
      const chunkSize = this.readInt32();
      const chunkData = this.readBytes(chunkSize);
      
      // For legacy format, we need PKWARE decompression
      // For now, copy as-is (actual PKWARE implementation would go here)
      const decompressed = await this.decompressPKWare(chunkData);
      
      const copyLength = Math.min(decompressed.length, size - resultOffset);
      result.set(decompressed.slice(0, copyLength), resultOffset);
      resultOffset += copyLength;
    }
    
    return result;
  }

  /**
   * Parse modern section with zlib decompression
   */
  private async parseModernSection_Standard(size: number, chunkCount: number): Promise<Uint8Array> {
    console.log(`[SectionBasedParser] Parsing modern section: ${chunkCount} chunks`);
    
    const chunks: Uint8Array[] = [];
    
    for (let i = 0; i < chunkCount; i++) {
      const chunkSize = this.readInt32();
      const chunkData = this.readBytes(chunkSize);
      
      // Check for zlib magic (0x78)
      if (chunkSize > 4 && chunkData[0] === 0x78) {
        try {
          const decompressed = await this.decompressZlib(chunkData);
          chunks.push(decompressed);
        } catch (error) {
          console.warn('[SectionBasedParser] Zlib decompression failed, using raw data');
          chunks.push(chunkData);
        }
      } else {
        chunks.push(chunkData);
      }
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * Parse modern sections (SKIN, LMTS, etc.)
   */
  private async parseModernSection(): Promise<{data: Uint8Array, sectionId: number, compressed: boolean}> {
    const sectionId = this.readInt32(); // String ID
    const rawSize = this.readInt32(); // Raw size
    
    const rawData = this.readBytes(rawSize);
    
    // Known modern section sizes from screp
    const knownSizes: Record<number, number> = {
      1313426259: 0x15e0, // "SKIN"
      1398033740: 0x1c,   // "LMTS"
      1481197122: 0x08,   // "BFIX"
      1380729667: 0xc0,   // "CCLR"
      1195787079: 0x19    // "GCFG"
    };
    
    const expectedSize = knownSizes[sectionId];
    if (!expectedSize) {
      // Unknown section, return raw data
      return { data: rawData, sectionId, compressed: false };
    }
    
    // Try decompression if needed
    if (rawData.length > 4 && rawData[0] === 0x78) {
      try {
        const decompressed = await this.decompressZlib(rawData);
        return { data: decompressed, sectionId, compressed: true };
      } catch (error) {
        return { data: rawData, sectionId, compressed: false };
      }
    }
    
    return { data: rawData, sectionId, compressed: false };
  }

  /**
   * Validate replay ID section
   */
  private async validateReplayId(data: Uint8Array): Promise<void> {
    const validIds = [
      new Uint8Array([0x73, 0x65, 0x52, 0x53]), // "seRS"
      new Uint8Array([0x72, 0x65, 0x52, 0x53])  // "reRS"
    ];
    
    const isValid = validIds.some(validId => 
      data.length === validId.length && 
      data.every((byte, index) => byte === validId[index])
    );
    
    if (!isValid) {
      throw new Error('Invalid replay ID');
    }
  }

  /**
   * Parse header section (0x279 bytes)
   */
  private async parseHeaderSection(data: Uint8Array): Promise<ReplayHeader> {
    console.log('[SectionBasedParser] Parsing header section');
    
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;
    
    const header: ReplayHeader = {
      engine: view.getUint8(offset),
      frames: view.getUint32(offset + 1, true),
      startTime: new Date(view.getUint32(offset + 8, true) * 1000),
      title: this.readNullTerminatedString(data, offset + 0x18, 28),
      mapWidth: view.getUint16(offset + 0x34, true),
      mapHeight: view.getUint16(offset + 0x36, true),
      availSlotsCount: view.getUint8(offset + 0x39),
      speed: view.getUint8(offset + 0x3a),
      type: view.getUint16(offset + 0x3c, true),
      subType: view.getUint16(offset + 0x3e, true),
      host: this.readNullTerminatedString(data, offset + 0x48, 24),
      map: this.readNullTerminatedString(data, offset + 0x61, 26),
      players: []
    };
    
    // Parse player slots (12 slots, 36 bytes each)
    const playersOffset = 0xa1;
    for (let i = 0; i < 12; i++) {
      const playerOffset = playersOffset + (i * 36);
      const player: PlayerSlot = {
        slotId: view.getUint16(playerOffset, true),
        id: view.getUint8(playerOffset + 4),
        type: view.getUint8(playerOffset + 8),
        race: view.getUint8(playerOffset + 9),
        team: view.getUint8(playerOffset + 10),
        name: this.readNullTerminatedString(data, playerOffset + 11, 25),
        color: i < 8 ? this.getPlayerColor(view.getUint32(0x251 + i * 4, true)) : '#FFFFFF'
      };
      
      if (player.name) {
        header.players.push(player);
      }
    }
    
    return header;
  }

  /**
   * Parse commands section - will be handled by enhanced command parser
   */
  private async parseCommandsSection(data: Uint8Array): Promise<any[]> {
    console.log('[SectionBasedParser] Parsing commands section');
    // This will be handled by the enhanced command extractor
    return [];
  }

  /**
   * Parse map data section
   */
  private async parseMapDataSection(data: Uint8Array): Promise<any> {
    console.log('[SectionBasedParser] Parsing map data section');
    // Basic map data parsing
    return { size: data.length };
  }

  /**
   * Parse player names section
   */
  private async parsePlayerNamesSection(data: Uint8Array): Promise<string[]> {
    console.log('[SectionBasedParser] Parsing player names section');
    
    const names: string[] = [];
    for (let i = 0; i < 8; i++) {
      const nameOffset = i * 96;
      if (nameOffset + 96 <= data.length) {
        const name = this.readNullTerminatedString(data, nameOffset, 96);
        if (name) {
          names.push(name);
        }
      }
    }
    
    return names;
  }

  /**
   * Parse modern sections
   */
  private async parseModernSections(modernSections: Record<string, any>): Promise<void> {
    console.log('[SectionBasedParser] Parsing modern sections');
    
    // Continue parsing while we have data
    while (this.position < this.data.length - 8) {
      try {
        const modernResult = await this.parseModernSection();
        const sectionName = this.getSectionName(modernResult.sectionId);
        modernSections[sectionName] = modernResult.data;
        console.log(`[SectionBasedParser] Parsed modern section: ${sectionName}`);
      } catch (error) {
        console.log('[SectionBasedParser] No more modern sections');
        break;
      }
    }
  }

  // Utility methods
  private readInt32(): number {
    const value = new DataView(this.data.buffer, this.data.byteOffset + this.position, 4).getUint32(0, true);
    this.position += 4;
    return value;
  }

  private readBytes(length: number): Uint8Array {
    const bytes = this.data.slice(this.position, this.position + length);
    this.position += length;
    return bytes;
  }

  private readNullTerminatedString(data: Uint8Array, offset: number, maxLength: number): string {
    let length = 0;
    for (let i = 0; i < maxLength; i++) {
      if (data[offset + i] === 0) {
        length = i;
        break;
      }
      if (i === maxLength - 1) {
        length = maxLength;
      }
    }
    
    if (length === 0) return '';
    
    const stringData = data.slice(offset, offset + length);
    return new TextDecoder('utf-8').decode(stringData).trim();
  }

  private getPlayerColor(colorId: number): string {
    const colors = [
      '#FF0000', '#0000FF', '#00FFFF', '#800080',
      '#FFFF00', '#FFA500', '#00FF00', '#FFB6C1'
    ];
    return colors[colorId % colors.length] || '#FFFFFF';
  }

  private getSectionName(sectionId: number): string {
    const sectionNames: Record<number, string> = {
      1313426259: 'SKIN',
      1398033740: 'LMTS', 
      1481197122: 'BFIX',
      1380729667: 'CCLR',
      1195787079: 'GCFG'
    };
    
    const idBytes = new Uint8Array(4);
    new DataView(idBytes.buffer).setUint32(0, sectionId, true);
    const name = sectionNames[sectionId] || new TextDecoder('latin1').decode(idBytes);
    
    return name;
  }

  private async decompressZlib(data: Uint8Array): Promise<Uint8Array> {
    try {
      const stream = new DecompressionStream('deflate');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      // Skip zlib header (2 bytes) and use raw deflate
      writer.write(data.slice(2, -4)); // Also skip adler32 checksum at end
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let result;
      
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      return combined;
    } catch (error) {
      console.warn('[SectionBasedParser] Zlib decompression failed:', error);
      throw error;
    }
  }

  private async decompressPKWare(data: Uint8Array): Promise<Uint8Array> {
    // Simplified PKWARE decompression - would need full implementation
    console.warn('[SectionBasedParser] PKWARE decompression not fully implemented');
    return data;
  }
}
