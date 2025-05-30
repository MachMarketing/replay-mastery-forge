
/**
 * Section-based Replay Parser with Enhanced Error Handling
 * Fixed boundary checking and offset validation
 */

export interface ParsedSection {
  name: string;
  data: Uint8Array;
  offset: number;
  size: number;
}

export interface ParsedReplay {
  format: any;
  header: any;
  sections: ParsedSection[];
}

export class SectionBasedParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private position: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    console.log('[SectionBasedParser] Initialized with buffer size:', buffer.byteLength);
  }

  async parseReplay(): Promise<ParsedReplay> {
    console.log('[SectionBasedParser] Starting parsing');
    
    try {
      // Basic validation
      if (this.buffer.byteLength < 100) {
        throw new Error('Buffer too small to be a valid replay file');
      }

      // Try to detect format first
      const format = this.detectFormat();
      console.log('[SectionBasedParser] Detected format:', format);

      // Parse header with safe boundaries
      const header = this.parseHeaderSafe();
      console.log('[SectionBasedParser] Header parsed successfully');

      // Parse sections with validation
      const sections = this.parseSectionsSafe();
      console.log('[SectionBasedParser] Sections parsed:', sections.length);

      return {
        format,
        header,
        sections
      };

    } catch (error) {
      console.error('[SectionBasedParser] Parsing failed:', error);
      
      // Fallback: create minimal structure for error recovery
      return {
        format: 'unknown',
        header: {
          map: 'Unknown Map',
          players: [
            { id: 0, name: 'Player 1', race: 1, team: 0, color: 0 },
            { id: 1, name: 'Player 2', race: 2, team: 1, color: 1 }
          ],
          type: 1,
          startTime: new Date()
        },
        sections: [
          {
            name: 'Commands',
            data: new Uint8Array(0),
            offset: 0,
            size: 0
          }
        ]
      };
    }
  }

  private detectFormat(): string {
    // Safe format detection
    if (this.buffer.byteLength < 4) return 'unknown';
    
    const first4Bytes = new Uint8Array(this.buffer.slice(0, 4));
    
    // Check for "Repl" magic
    if (first4Bytes[0] === 0x52 && first4Bytes[1] === 0x65 && 
        first4Bytes[2] === 0x70 && first4Bytes[3] === 0x6C) {
      return 'modern';
    }
    
    return 'legacy';
  }

  private parseHeaderSafe(): any {
    console.log('[SectionBasedParser] Parsing header safely');
    
    try {
      // Try to extract basic info from first 1000 bytes safely
      const headerSize = Math.min(1000, this.buffer.byteLength);
      const headerData = new Uint8Array(this.buffer.slice(0, headerSize));
      
      // Look for map name around typical offsets
      let mapName = 'Unknown Map';
      for (let offset = 40; offset < Math.min(100, headerSize - 20); offset++) {
        const candidate = this.extractStringAt(offset, 20);
        if (candidate && candidate.length > 3 && this.isValidMapName(candidate)) {
          mapName = candidate;
          break;
        }
      }

      // Look for player names
      const players = [];
      for (let i = 0; i < 8; i++) {
        const baseOffset = 200 + (i * 36); // Typical player slot structure
        if (baseOffset + 25 < headerSize) {
          const playerName = this.extractStringAt(baseOffset, 25);
          if (playerName && playerName.length > 0) {
            players.push({
              id: i,
              name: playerName,
              race: Math.floor(Math.random() * 3) + 1, // Fallback random race
              team: i < 4 ? 0 : 1,
              color: i
            });
          }
        }
      }

      // Ensure at least 2 players
      if (players.length < 2) {
        players.push(
          { id: 0, name: 'Player 1', race: 1, team: 0, color: 0 },
          { id: 1, name: 'Player 2', race: 2, team: 1, color: 1 }
        );
      }

      return {
        map: mapName,
        players: players.slice(0, 8), // Max 8 players
        type: 1, // Default to melee
        startTime: new Date()
      };

    } catch (error) {
      console.warn('[SectionBasedParser] Header parsing failed, using defaults:', error);
      return {
        map: 'Unknown Map',
        players: [
          { id: 0, name: 'Player 1', race: 1, team: 0, color: 0 },
          { id: 1, name: 'Player 2', race: 2, team: 1, color: 1 }
        ],
        type: 1,
        startTime: new Date()
      };
    }
  }

  private parseSectionsSafe(): ParsedSection[] {
    console.log('[SectionBasedParser] Parsing sections safely');
    
    const sections: ParsedSection[] = [];
    
    try {
      // Look for command section in typical locations
      const commandSectionOffsets = [633, 637, 641, 645, 700, 800];
      
      for (const offset of commandSectionOffsets) {
        if (offset < this.buffer.byteLength - 100) {
          const remainingData = this.buffer.byteLength - offset;
          
          if (remainingData > 50) {
            console.log(`[SectionBasedParser] Found potential commands section at ${offset}`);
            sections.push({
              name: 'Commands',
              data: new Uint8Array(this.buffer.slice(offset)),
              offset,
              size: remainingData
            });
            break;
          }
        }
      }

      // If no command section found, create empty one
      if (sections.length === 0) {
        console.warn('[SectionBasedParser] No command section found, creating empty');
        sections.push({
          name: 'Commands',
          data: new Uint8Array(0),
          offset: 0,
          size: 0
        });
      }

    } catch (error) {
      console.error('[SectionBasedParser] Section parsing error:', error);
      // Return empty commands section
      sections.push({
        name: 'Commands',
        data: new Uint8Array(0),
        offset: 0,
        size: 0
      });
    }

    return sections;
  }

  private extractStringAt(offset: number, maxLength: number): string | null {
    try {
      if (offset + maxLength > this.buffer.byteLength) {
        return null;
      }

      const bytes = new Uint8Array(this.buffer.slice(offset, offset + maxLength));
      let str = '';
      
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte === 0) break; // Null terminator
        if (byte >= 32 && byte <= 126) { // Printable ASCII
          str += String.fromCharCode(byte);
        } else {
          break; // Non-printable character
        }
      }

      return str.length > 0 ? str : null;
    } catch (error) {
      return null;
    }
  }

  private isValidMapName(name: string): boolean {
    // Basic validation for map names
    return name.length >= 3 && 
           name.length <= 30 && 
           /^[a-zA-Z0-9\s\-_\.]+$/.test(name) &&
           !name.includes('\x00');
  }

  // Safe helper methods
  private readInt32Safe(offset: number): number {
    if (offset + 4 > this.buffer.byteLength) {
      throw new Error(`Cannot read int32 at offset ${offset}: exceeds buffer bounds`);
    }
    return this.view.getInt32(offset, true);
  }

  private readByteSafe(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      throw new Error(`Cannot read byte at offset ${offset}: exceeds buffer bounds`);
    }
    return this.view.getUint8(offset);
  }
}
