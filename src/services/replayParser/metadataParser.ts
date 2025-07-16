/**
 * Client-side metadata parser for StarCraft Remastered .rep files
 * Extracts basic information (header, players) for immediate user feedback
 */

export interface ReplayMetadata {
  header: {
    version: string;
    mapName: string;
    gameType: string;
    dateCreated: string;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  fileSize: number;
  fileName: string;
}

export class MetadataParser {
  static async parseMetadata(file: File): Promise<ReplayMetadata> {
    console.log('[MetadataParser] Parsing metadata for:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    let offset = 0;
    
    // Parse header section
    const header = this.parseHeader(data, offset);
    offset += header.bytesRead;
    
    // Parse players section
    const players = this.parsePlayers(data, offset);
    
    const metadata: ReplayMetadata = {
      header: {
        version: header.version,
        mapName: header.mapName,
        gameType: header.gameType,
        dateCreated: new Date().toISOString(), // Will be updated by server parsing
      },
      players: players.players,
      fileSize: file.size,
      fileName: file.name,
    };
    
    console.log('[MetadataParser] Extracted metadata:', {
      map: metadata.header.mapName,
      playerCount: metadata.players.length,
      fileSize: `${(metadata.fileSize / 1024).toFixed(1)}KB`
    });
    
    return metadata;
  }
  
  private static parseHeader(data: Uint8Array, startOffset: number) {
    let offset = startOffset;
    
    // Skip initial bytes and look for map name
    // StarCraft replay files have the map name stored as a null-terminated string
    let mapName = '';
    let version = '';
    let gameType = '';
    
    try {
      // Try to find map name in typical locations
      // Map names are usually stored around offset 0x18-0x40
      for (let searchOffset = 0x18; searchOffset < Math.min(0x100, data.length - 32); searchOffset++) {
        const potentialString = this.extractNullTerminatedString(data, searchOffset, 32);
        if (potentialString.length > 3 && potentialString.length < 32 && this.isValidMapName(potentialString)) {
          mapName = potentialString;
          break;
        }
      }
      
      // Extract version info (usually at the beginning)
      if (data.length > 4) {
        version = `${data[0]}.${data[1]}.${data[2]}.${data[3]}`;
      }
      
      // Determine game type based on file structure
      gameType = data.length > 1000 ? 'Multiplayer' : 'Single Player';
      
    } catch (error) {
      console.warn('[MetadataParser] Header parsing error, using defaults:', error);
      mapName = 'Unknown Map';
      version = 'Unknown';
      gameType = 'Unknown';
    }
    
    return {
      version: version || 'Unknown',
      mapName: mapName || 'Unknown Map',
      gameType,
      bytesRead: 64 // Approximate header size
    };
  }
  
  private static parsePlayers(data: Uint8Array, startOffset: number) {
    const players: Array<{
      name: string;
      race: string;
      team: number;
      color: number;
    }> = [];
    
    try {
      // Player information is typically stored after the header
      // Look for player names (null-terminated strings of reasonable length)
      const races = ['Zerg', 'Terran', 'Protoss', 'Random'];
      
      for (let searchOffset = startOffset; searchOffset < Math.min(startOffset + 500, data.length - 16); searchOffset++) {
        const potentialName = this.extractNullTerminatedString(data, searchOffset, 16);
        
        if (potentialName.length >= 2 && potentialName.length <= 12 && this.isValidPlayerName(potentialName)) {
          // Try to determine race from nearby bytes
          const raceIndex = data[searchOffset + potentialName.length + 1] % races.length;
          
          players.push({
            name: potentialName,
            race: races[raceIndex] || 'Unknown',
            team: players.length < 4 ? 1 : 2, // Simple team assignment
            color: players.length % 8
          });
          
          // Stop after finding reasonable number of players
          if (players.length >= 8) break;
        }
      }
      
      // If no players found, create defaults
      if (players.length === 0) {
        players.push(
          { name: 'Player 1', race: 'Unknown', team: 1, color: 0 },
          { name: 'Player 2', race: 'Unknown', team: 2, color: 1 }
        );
      }
      
    } catch (error) {
      console.warn('[MetadataParser] Player parsing error, using defaults:', error);
      players.push(
        { name: 'Player 1', race: 'Unknown', team: 1, color: 0 },
        { name: 'Player 2', race: 'Unknown', team: 2, color: 1 }
      );
    }
    
    return { players };
  }
  
  private static extractNullTerminatedString(data: Uint8Array, offset: number, maxLength: number): string {
    const bytes = [];
    for (let i = 0; i < maxLength && offset + i < data.length; i++) {
      const byte = data[offset + i];
      if (byte === 0) break; // Null terminator
      if (byte < 32 || byte > 126) return ''; // Not printable ASCII
      bytes.push(byte);
    }
    
    if (bytes.length === 0) return '';
    
    try {
      return new TextDecoder('ascii').decode(new Uint8Array(bytes));
    } catch {
      return '';
    }
  }
  
  private static isValidMapName(str: string): boolean {
    // Map names should contain reasonable characters and be meaningful
    return /^[a-zA-Z0-9\s\-_\(\)\.]{3,}$/.test(str) && 
           !str.includes('\x00') &&
           str.trim().length > 0;
  }
  
  private static isValidPlayerName(str: string): boolean {
    // Player names should be reasonable ASCII strings
    return /^[a-zA-Z0-9\[\]_\-\.]{2,12}$/.test(str) &&
           str.trim().length > 0;
  }
}