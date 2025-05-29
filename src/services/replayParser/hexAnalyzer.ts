
/**
 * Hex-Analyse für StarCraft: Remastered Replays
 * Findet die echte Struktur und Kompression
 */

export class HexAnalyzer {
  private data: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
  }

  /**
   * Analysiere die ersten 512 Bytes als Hex
   */
  analyzeHeader(): string {
    const headerBytes = this.data.slice(0, Math.min(512, this.data.length));
    let hex = '';
    let ascii = '';
    
    for (let i = 0; i < headerBytes.length; i += 16) {
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      let hexLine = '';
      let asciiLine = '';
      
      for (let j = 0; j < 16 && i + j < headerBytes.length; j++) {
        const byte = headerBytes[i + j];
        hexLine += byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
        asciiLine += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
      }
      
      hex += `${offset}: ${hexLine.padEnd(48)} |${asciiLine}|\n`;
    }
    
    return hex;
  }

  /**
   * Suche nach bekannten Signaturen
   */
  findSignatures(): Array<{type: string, offset: number, signature: string}> {
    const signatures = [
      { name: 'PKWare ZIP', bytes: [0x50, 0x4B] },
      { name: 'BZIP2', bytes: [0x42, 0x5A, 0x68] },
      { name: 'GZIP', bytes: [0x1F, 0x8B] },
      { name: 'ZLIB', bytes: [0x78, 0x9C] },
      { name: 'SC:BW Repl', bytes: [0x52, 0x65, 0x70, 0x6C] }, // "Repl"
      { name: 'SC:R Header', bytes: [0x00, 0x00, 0x00, 0x4A] }, // Mögliche SC:R Signatur
    ];

    const found = [];
    
    for (const sig of signatures) {
      for (let i = 0; i <= this.data.length - sig.bytes.length; i++) {
        let match = true;
        for (let j = 0; j < sig.bytes.length; j++) {
          if (this.data[i + j] !== sig.bytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          const sigHex = sig.bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
          found.push({
            type: sig.name,
            offset: i,
            signature: sigHex
          });
        }
      }
    }
    
    return found;
  }

  /**
   * Analysiere mögliche String-Bereiche
   */
  findPossibleStrings(minLength: number = 3): Array<{offset: number, text: string}> {
    const strings = [];
    let currentString = '';
    let startOffset = 0;
    
    for (let i = 0; i < this.data.length; i++) {
      const byte = this.data[i];
      
      if (byte >= 32 && byte <= 126) { // Druckbare ASCII
        if (currentString.length === 0) {
          startOffset = i;
        }
        currentString += String.fromCharCode(byte);
      } else {
        if (currentString.length >= minLength) {
          strings.push({
            offset: startOffset,
            text: currentString
          });
        }
        currentString = '';
      }
    }
    
    // Letzten String hinzufügen
    if (currentString.length >= minLength) {
      strings.push({
        offset: startOffset,
        text: currentString
      });
    }
    
    return strings.slice(0, 50); // Limitiere auf erste 50
  }

  /**
   * Suche nach möglichen Frame-Counts (32-bit LE)
   */
  findPossibleFrameCounts(): Array<{offset: number, frames: number, minutes: number}> {
    const frameCounts = [];
    
    for (let i = 0; i <= this.data.length - 4; i += 4) {
      const frames = this.data[i] | 
                    (this.data[i + 1] << 8) | 
                    (this.data[i + 2] << 16) | 
                    (this.data[i + 3] << 24);
      
      // Realistische Frame-Counts (1-120 Minuten)
      const minutes = frames / 23.81 / 60;
      if (minutes > 1 && minutes < 120) {
        frameCounts.push({
          offset: i,
          frames,
          minutes: Math.round(minutes * 10) / 10
        });
      }
    }
    
    return frameCounts.slice(0, 20);
  }

  /**
   * Erstelle vollständigen Analyse-Report
   */
  generateReport(): string {
    const signatures = this.findSignatures();
    const strings = this.findPossibleStrings();
    const frameCounts = this.findPossibleFrameCounts();
    
    let report = `=== SC:R REPLAY HEX ANALYSE ===\n`;
    report += `Dateigröße: ${this.data.length} bytes\n\n`;
    
    report += `--- HEADER HEX DUMP ---\n`;
    report += this.analyzeHeader();
    report += `\n`;
    
    report += `--- GEFUNDENE SIGNATUREN ---\n`;
    if (signatures.length > 0) {
      signatures.forEach(sig => {
        report += `${sig.type} @ 0x${sig.offset.toString(16)}: ${sig.signature}\n`;
      });
    } else {
      report += `Keine bekannten Signaturen gefunden\n`;
    }
    report += `\n`;
    
    report += `--- MÖGLICHE STRINGS ---\n`;
    strings.slice(0, 10).forEach(str => {
      report += `0x${str.offset.toString(16)}: "${str.text}"\n`;
    });
    report += `\n`;
    
    report += `--- MÖGLICHE FRAME COUNTS ---\n`;
    frameCounts.slice(0, 10).forEach(fc => {
      report += `0x${fc.offset.toString(16)}: ${fc.frames} frames (${fc.minutes} min)\n`;
    });
    
    return report;
  }
}
