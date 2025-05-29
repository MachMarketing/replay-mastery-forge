
/**
 * Dekompressor für StarCraft: Remastered Replays
 * Versucht verschiedene Dekompressionsverfahren
 */

import * as pako from 'pako';

export class SCRemasteredDecompressor {
  private data: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
  }

  /**
   * Versuche ZLIB Dekompression ab verschiedenen Offsets
   */
  tryZlibDecompression(): Array<{offset: number, success: boolean, size: number, preview: string}> {
    const results = [];
    const offsets = [0x28, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x100, 0x200];
    
    for (const offset of offsets) {
      if (offset >= this.data.length) continue;
      
      try {
        const compressedData = this.data.slice(offset);
        const decompressed = pako.inflate(compressedData);
        
        // Erste 100 Bytes als Preview
        const preview = Array.from(decompressed.slice(0, 100))
          .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
          .join('');
        
        results.push({
          offset,
          success: true,
          size: decompressed.length,
          preview
        });
        
      } catch (error) {
        results.push({
          offset,
          success: false,
          size: 0,
          preview: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }

  /**
   * Versuche GZIP Dekompression
   */
  tryGzipDecompression(): Array<{offset: number, success: boolean, size: number, preview: string}> {
    const results = [];
    const offsets = [0, 0x28, 0x30, 0x40];
    
    for (const offset of offsets) {
      if (offset >= this.data.length) continue;
      
      try {
        const compressedData = this.data.slice(offset);
        const decompressed = pako.ungzip(compressedData);
        
        const preview = Array.from(decompressed.slice(0, 100))
          .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
          .join('');
        
        results.push({
          offset,
          success: true,
          size: decompressed.length,
          preview
        });
        
      } catch (error) {
        results.push({
          offset,
          success: false,
          size: 0,
          preview: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }

  /**
   * Analysiere rohe Daten ohne Dekompression
   */
  analyzeRawStructure(): {
    possibleHeader: string,
    possibleMapName: string,
    possiblePlayerNames: string[],
    frameCountCandidates: number[]
  } {
    // Suche nach Map-Namen (meist bei 0x45-0x65)
    let possibleMapName = '';
    for (let i = 0x40; i < 0x80 && i < this.data.length - 20; i++) {
      let mapCandidate = '';
      for (let j = 0; j < 20 && i + j < this.data.length; j++) {
        const byte = this.data[i + j];
        if (byte === 0) break;
        if (byte >= 32 && byte <= 126) {
          mapCandidate += String.fromCharCode(byte);
        } else {
          break;
        }
      }
      if (mapCandidate.length > possibleMapName.length && mapCandidate.length >= 3) {
        possibleMapName = mapCandidate;
      }
    }

    // Suche nach Player-Namen (meist ab 0x161)
    const possiblePlayerNames = [];
    for (let i = 0x150; i < 0x300 && i < this.data.length - 25; i += 36) {
      let playerName = '';
      for (let j = 0; j < 25 && i + j < this.data.length; j++) {
        const byte = this.data[i + j];
        if (byte === 0) break;
        if (byte >= 32 && byte <= 126) {
          playerName += String.fromCharChar(byte);
        } else {
          break;
        }
      }
      if (playerName.length >= 2) {
        possiblePlayerNames.push(playerName);
      }
    }

    // Header als Hex
    const headerBytes = this.data.slice(0, 64);
    const possibleHeader = Array.from(headerBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');

    // Frame Count Kandidaten
    const frameCountCandidates = [];
    for (let i = 0; i < 64; i += 4) {
      if (i + 3 < this.data.length) {
        const frames = this.data[i] | 
                      (this.data[i + 1] << 8) | 
                      (this.data[i + 2] << 16) | 
                      (this.data[i + 3] << 24);
        const minutes = frames / 23.81 / 60;
        if (minutes > 1 && minutes < 120) {
          frameCountCandidates.push(frames);
        }
      }
    }

    return {
      possibleHeader,
      possibleMapName,
      possiblePlayerNames,
      frameCountCandidates
    };
  }

  /**
   * Vollständige Dekompressionsanalyse
   */
  fullAnalysis(): string {
    let report = `=== SC:R DEKOMPRESSIONSANALYSE ===\n\n`;
    
    report += `--- ZLIB VERSUCHE ---\n`;
    const zlibResults = this.tryZlibDecompression();
    zlibResults.forEach(result => {
      report += `Offset 0x${result.offset.toString(16)}: `;
      if (result.success) {
        report += `SUCCESS (${result.size} bytes) - "${result.preview.substring(0, 50)}"\n`;
      } else {
        report += `FAILED - ${result.preview}\n`;
      }
    });
    
    report += `\n--- GZIP VERSUCHE ---\n`;
    const gzipResults = this.tryGzipDecompression();
    gzipResults.forEach(result => {
      report += `Offset 0x${result.offset.toString(16)}: `;
      if (result.success) {
        report += `SUCCESS (${result.size} bytes) - "${result.preview.substring(0, 50)}"\n`;
      } else {
        report += `FAILED - ${result.preview}\n`;
      }
    });
    
    report += `\n--- ROHE STRUKTURANALYSE ---\n`;
    const rawAnalysis = this.analyzeRawStructure();
    report += `Header: ${rawAnalysis.possibleHeader}\n`;
    report += `Map Name: "${rawAnalysis.possibleMapName}"\n`;
    report += `Player Names: ${rawAnalysis.possiblePlayerNames.join(', ')}\n`;
    report += `Frame Counts: ${rawAnalysis.frameCountCandidates.join(', ')}\n`;
    
    return report;
  }
}
