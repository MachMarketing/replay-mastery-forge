
/**
 * Debug-Analyzer für .rep-Dateien
 * Analysiert die echte Struktur und Inhalte
 */

export class DebugAnalyzer {
  private data: Uint8Array;
  private dataView: DataView;

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Umfassende Analyse der .rep-Datei
   */
  analyzeReplay(): void {
    console.log('=== UMFASSENDE .REP DATEI ANALYSE ===');
    console.log('Dateigröße:', this.data.length, 'bytes');
    
    // 1. Header-Analyse
    this.analyzeHeader();
    
    // 2. Datei-Struktur analysieren
    this.analyzeFileStructure();
    
    // 3. Nach Command-Blöcken suchen
    this.findCommandBlocks();
    
    // 4. Nach Spieler-Daten suchen
    this.findPlayerData();
    
    // 5. Hex-Dump wichtiger Bereiche
    this.hexDumpImportantSections();
  }

  private analyzeHeader(): void {
    console.log('\n=== HEADER ANALYSE ===');
    
    // Erste 1024 Bytes als Text interpretieren
    const headerText = new TextDecoder('utf-8', { fatal: false })
      .decode(this.data.slice(0, Math.min(1024, this.data.length)));
    
    console.log('Header Text (erste 200 Zeichen):', headerText.substring(0, 200));
    
    // Nach bekannten Mustern suchen
    const patterns = [
      'StarCraft',
      'Brood War', 
      'Remastered',
      '.scm',
      '.scx'
    ];
    
    patterns.forEach(pattern => {
      const index = headerText.indexOf(pattern);
      if (index !== -1) {
        console.log(`Gefunden "${pattern}" at position:`, index);
      }
    });
    
    // Erste 64 Bytes als Hex
    console.log('Erste 64 Bytes (Hex):', 
      Array.from(this.data.slice(0, 64))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
    );
  }

  private analyzeFileStructure(): void {
    console.log('\n=== DATEI-STRUKTUR ANALYSE ===');
    
    // Suche nach möglichen Sektions-Headern
    const sectionMarkers = [
      0x00, 0x01, 0x02, 0x03, // Frame markers
      0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // Action opcodes
      0x13, 0x14, 0x15, 0x18, 0x1D, 0x1E, // More action opcodes
      0x2F, 0x31 // Research/Upgrade opcodes
    ];
    
    const markerCounts: Record<number, number> = {};
    
    for (let i = 0; i < this.data.length; i++) {
      const byte = this.data[i];
      if (sectionMarkers.includes(byte)) {
        markerCounts[byte] = (markerCounts[byte] || 0) + 1;
      }
    }
    
    console.log('Mögliche Action-Opcodes gefunden:');
    Object.entries(markerCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([opcode, count]) => {
        console.log(`  0x${parseInt(opcode).toString(16).padStart(2, '0')}: ${count} mal`);
      });
  }

  private findCommandBlocks(): void {
    console.log('\n=== COMMAND-BLOCK SUCHE ===');
    
    // Verschiedene mögliche Command-Start-Positionen testen
    const possibleStarts = [
      0x279, // 633 decimal - oft verwendet
      0x200, // 512 
      0x300, // 768
      0x400  // 1024
    ];
    
    possibleStarts.forEach(start => {
      if (start < this.data.length - 100) {
        console.log(`\nAnalysiere Command-Block ab Position 0x${start.toString(16)} (${start}):`);
        this.analyzeCommandBlock(start, 100);
      }
    });
  }

  private analyzeCommandBlock(start: number, length: number): void {
    const block = this.data.slice(start, start + length);
    
    // Erste 20 Bytes als Hex
    console.log('Erste 20 Bytes:', 
      Array.from(block.slice(0, 20))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
    );
    
    // Suche nach Frame-Patterns
    let frameCount = 0;
    let actionCount = 0;
    
    for (let i = 0; i < Math.min(block.length - 1, 50); i++) {
      const byte = block[i];
      
      if (byte === 0x00) {
        frameCount++;
      } else if (byte >= 0x09 && byte <= 0x31) {
        actionCount++;
        console.log(`  Mögliche Action bei +${i}: 0x${byte.toString(16)}`);
      }
    }
    
    console.log(`Frame-Marker (0x00): ${frameCount}, Mögliche Actions: ${actionCount}`);
  }

  private findPlayerData(): void {
    console.log('\n=== SPIELER-DATEN SUCHE ===');
    
    // Suche nach Spielernamen (ASCII-Text in der Datei)
    const textContent = new TextDecoder('utf-8', { fatal: false })
      .decode(this.data);
    
    // Typische Spielernamen-Pattern
    const namePatterns = /[A-Za-z][A-Za-z0-9_]{2,11}/g;
    const possibleNames = textContent.match(namePatterns);
    
    if (possibleNames) {
      console.log('Mögliche Spielernamen:', possibleNames.slice(0, 10));
    }
    
    // Suche nach Race-IDs (0, 1, 2 für Z, T, P)
    console.log('\nMögliche Race-Daten:');
    for (let i = 0; i < this.data.length - 10; i++) {
      const byte = this.data[i];
      if (byte <= 2) {
        const context = Array.from(this.data.slice(Math.max(0, i-5), i+10))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(`  Position ${i}: ${byte} (Context: ${context})`);
        
        // Nur erste 5 Treffer anzeigen
        if (i > 50) break;
      }
    }
  }

  private hexDumpImportantSections(): void {
    console.log('\n=== HEX-DUMP WICHTIGER BEREICHE ===');
    
    const sections = [
      { name: 'Header', start: 0, length: 128 },
      { name: 'Möglicher Command-Start 633', start: 633, length: 64 },
      { name: 'Datei-Ende', start: this.data.length - 64, length: 64 }
    ];
    
    sections.forEach(section => {
      if (section.start >= 0 && section.start < this.data.length) {
        console.log(`\n${section.name} (ab ${section.start}):`);
        const data = this.data.slice(section.start, section.start + section.length);
        
        for (let i = 0; i < data.length; i += 16) {
          const line = Array.from(data.slice(i, i + 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          console.log(`  ${(section.start + i).toString(16).padStart(4, '0')}: ${line}`);
        }
      }
    });
  }
}
