
/**
 * Spezialisierter Struktur-Analyzer für dekomprimierte seRS-Daten
 */

export interface SeRSStructureMap {
  playerDataOffset: number;
  commandsOffset: number;
  mapNameOffset: number;
  frameCountOffset: number;
  confidence: number;
}

export class SeRSStructureAnalyzer {
  private data: Uint8Array;
  private view: DataView;

  constructor(decompressedData: Uint8Array) {
    this.data = decompressedData;
    this.view = new DataView(decompressedData.buffer, decompressedData.byteOffset, decompressedData.byteLength);
  }

  /**
   * Analysiere die Struktur der dekomprimierten seRS-Daten
   */
  analyzeStructure(): SeRSStructureMap {
    console.log('[SeRSStructureAnalyzer] Analyzing decompressed seRS structure...');
    console.log('[SeRSStructureAnalyzer] Data size:', this.data.length);

    const result: SeRSStructureMap = {
      playerDataOffset: -1,
      commandsOffset: -1,
      mapNameOffset: -1,
      frameCountOffset: -1,
      confidence: 0
    };

    // Suche Player-Daten (nach lesbaren Namen)
    result.playerDataOffset = this.findPlayerDataOffset();
    
    // Suche Map-Name
    result.mapNameOffset = this.findMapNameOffset();
    
    // Suche Frame Count
    result.frameCountOffset = this.findFrameCountOffset();
    
    // Suche Commands (nach Action-Opcodes)
    result.commandsOffset = this.findCommandsOffset();

    // Berechne Vertrauen basierend auf gefundenen Strukturen
    result.confidence = this.calculateConfidence(result);

    console.log('[SeRSStructureAnalyzer] Structure analysis complete:', {
      playerData: result.playerDataOffset,
      commands: result.commandsOffset,
      mapName: result.mapNameOffset,
      frameCount: result.frameCountOffset,
      confidence: result.confidence
    });

    return result;
  }

  /**
   * Finde Player-Daten durch Suche nach lesbaren Namen
   */
  private findPlayerDataOffset(): number {
    console.log('[SeRSStructureAnalyzer] Searching for player data...');
    
    // Suche in den ersten 2KB nach lesbaren Spielernamen
    const scanRange = Math.min(2048, this.data.length - 25);
    
    for (let offset = 0; offset < scanRange; offset += 4) {
      if (this.hasValidPlayerNameAt(offset)) {
        console.log('[SeRSStructureAnalyzer] Found potential player data at offset:', offset);
        return offset;
      }
    }

    return -1;
  }

  /**
   * Prüfe ob an einer Position ein gültiger Spielername steht
   */
  private hasValidPlayerNameAt(offset: number): boolean {
    if (offset + 25 > this.data.length) return false;

    const nameBytes = this.data.slice(offset, offset + 25);
    const nullIndex = nameBytes.indexOf(0);
    
    if (nullIndex < 3) return false; // Zu kurz
    
    const nameLength = nullIndex;
    let validChars = 0;
    let letterCount = 0;

    for (let i = 0; i < nameLength; i++) {
      const byte = nameBytes[i];
      
      // Gültige ASCII-Zeichen
      if (byte >= 32 && byte <= 126) {
        validChars++;
        
        // Buchstaben zählen
        if ((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)) {
          letterCount++;
        }
      }
    }

    const validRatio = validChars / nameLength;
    const letterRatio = letterCount / nameLength;

    return validRatio > 0.8 && letterRatio > 0.3 && nameLength >= 3;
  }

  /**
   * Finde Map-Name durch Suche nach längeren ASCII-Strings
   */
  private findMapNameOffset(): number {
    console.log('[SeRSStructureAnalyzer] Searching for map name...');
    
    // Häufige Map-Name Offsets in seRS-Dateien
    const commonOffsets = [0x45, 0x61, 0x1CD, 0x100, 0x150, 0x200];
    
    for (const offset of commonOffsets) {
      if (this.hasValidMapNameAt(offset)) {
        console.log('[SeRSStructureAnalyzer] Found map name at offset:', offset);
        return offset;
      }
    }

    // Dynamische Suche
    for (let offset = 0; offset < Math.min(512, this.data.length - 32); offset += 4) {
      if (this.hasValidMapNameAt(offset)) {
        console.log('[SeRSStructureAnalyzer] Found map name at dynamic offset:', offset);
        return offset;
      }
    }

    return -1;
  }

  /**
   * Prüfe ob an einer Position ein gültiger Map-Name steht
   */
  private hasValidMapNameAt(offset: number): boolean {
    if (offset + 32 > this.data.length) return false;

    const nameBytes = this.data.slice(offset, offset + 32);
    const nullIndex = nameBytes.indexOf(0);
    
    if (nullIndex < 5 || nullIndex > 31) return false;
    
    const nameLength = nullIndex;
    let validChars = 0;

    for (let i = 0; i < nameLength; i++) {
      const byte = nameBytes[i];
      if (byte >= 32 && byte <= 126) {
        validChars++;
      }
    }

    const validRatio = validChars / nameLength;
    
    // Map-Namen haben oft Datei-Endungen oder spezielle Zeichen
    const text = String.fromCharCode(...nameBytes.slice(0, nameLength));
    const hasMapIndicators = text.includes('.') || text.includes('(') || text.includes(')') || 
                            text.includes(' ') || text.length >= 8;

    return validRatio > 0.7 && hasMapIndicators;
  }

  /**
   * Finde Frame Count durch Suche nach realistischen Werten
   */
  private findFrameCountOffset(): number {
    console.log('[SeRSStructureAnalyzer] Searching for frame count...');
    
    // Häufige Frame-Count Offsets
    const commonOffsets = [0x08, 0x0C, 0x10, 0x04, 0x14, 0x18];
    
    for (const offset of commonOffsets) {
      if (offset + 4 <= this.data.length) {
        const frames = this.view.getUint32(offset, true);
        if (this.isValidFrameCount(frames)) {
          console.log('[SeRSStructureAnalyzer] Found frame count at offset:', offset, 'value:', frames);
          return offset;
        }
      }
    }

    return -1;
  }

  /**
   * Prüfe ob ein Frame Count Wert realistisch ist
   */
  private isValidFrameCount(frames: number): boolean {
    // StarCraft läuft mit 24 FPS, typische Spiele: 1-60 Minuten
    return frames >= 1440 && frames <= 86400; // 1 Minute bis 60 Minuten
  }

  /**
   * Finde Commands durch Suche nach Action-Opcodes
   */
  private findCommandsOffset(): number {
    console.log('[SeRSStructureAnalyzer] Searching for commands...');
    
    // Bekannte Command-Opcodes
    const commandOpcodes = [0x09, 0x0A, 0x0C, 0x13, 0x14, 0x15, 0x1D, 0x1E];
    
    // Suche ab der zweiten Hälfte der Datei (Commands kommen meist später)
    const startOffset = Math.floor(this.data.length * 0.3);
    const endOffset = this.data.length - 100;
    
    for (let offset = startOffset; offset < endOffset; offset++) {
      if (this.hasCommandSequenceAt(offset, commandOpcodes)) {
        console.log('[SeRSStructureAnalyzer] Found command sequence at offset:', offset);
        return offset;
      }
    }

    return -1;
  }

  /**
   * Prüfe ob an einer Position eine Command-Sequenz beginnt
   */
  private hasCommandSequenceAt(offset: number, opcodes: number[]): boolean {
    if (offset + 20 > this.data.length) return false;

    let commandCount = 0;
    let frameMarkers = 0;
    
    // Prüfe die nächsten 20 Bytes auf Command-Pattern
    for (let i = 0; i < 20 && offset + i < this.data.length; i++) {
      const byte = this.data[offset + i];
      
      // Frame-Marker (0x00, 0x01, 0x02)
      if (byte <= 0x02) {
        frameMarkers++;
      }
      
      // Command-Opcodes
      if (opcodes.includes(byte)) {
        commandCount++;
      }
    }

    // Gute Mischung aus Commands und Frame-Markern
    return commandCount >= 2 && frameMarkers >= 3;
  }

  /**
   * Berechne Vertrauen in die gefundene Struktur
   */
  private calculateConfidence(result: SeRSStructureMap): number {
    let confidence = 0;
    
    if (result.playerDataOffset !== -1) confidence += 0.25;
    if (result.mapNameOffset !== -1) confidence += 0.25;
    if (result.frameCountOffset !== -1) confidence += 0.25;
    if (result.commandsOffset !== -1) confidence += 0.25;

    return confidence;
  }

  /**
   * Extrahiere einen sauberen String an einer Position
   */
  extractCleanString(offset: number, maxLength: number): string {
    if (offset + maxLength > this.data.length) return '';
    
    const bytes = this.data.slice(offset, offset + maxLength);
    const nullIndex = bytes.indexOf(0);
    const actualLength = nullIndex >= 0 ? nullIndex : maxLength;
    
    if (actualLength === 0) return '';
    
    try {
      return new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.slice(0, actualLength))
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();
    } catch {
      return '';
    }
  }
}
