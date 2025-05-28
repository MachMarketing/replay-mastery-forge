/**
 * Detailed replay file analyzer for debugging and format detection
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { BWRemasteredParser } from './bwRemastered/parser';
import { CompressionDetector } from './compressionDetector';

export interface ReplayAnalysisResult {
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };
  formatDetection: {
    magic: string;
    isCompressed: boolean;
    detectedFormat: string;
    estimatedVersion: string;
  };
  screpJsCompatibility: {
    available: boolean;
    parseSuccess: boolean;
    error?: string;
    resultKeys?: string[];
  };
  customParserResults: {
    parseSuccess: boolean;
    error?: string;
    extractedData?: any;
  };
  hexDump: {
    first256Bytes: string;
    playerDataSection: string;
    commandsSection: string;
  };
  recommendations: string[];
}

export class ReplayAnalyzer {
  async analyzeReplay(file: File): Promise<ReplayAnalysisResult> {
    console.log('[ReplayAnalyzer] Starting comprehensive analysis of:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Log raw file data for AI debugging
    console.log('[ReplayAnalyzer] Raw file info:');
    console.log('  - Size:', file.size, 'bytes');
    console.log('  - Type:', file.type);
    console.log('  - First 16 bytes:', Array.from(uint8Array.slice(0, 16)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
    
    // Basic file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || 'unknown'
    };
    
    // Format detection
    const formatDetection = this.analyzeFormat(uint8Array);
    console.log('[ReplayAnalyzer] Format detection result:', formatDetection);
    
    // Test screp-js compatibility
    const screpJsCompatibility = await this.testScrepJs(file);
    console.log('[ReplayAnalyzer] screp-js test result:', screpJsCompatibility);
    
    // Test custom parser
    const customParserResults = await this.testCustomParser(arrayBuffer);
    console.log('[ReplayAnalyzer] Custom parser result:', customParserResults);
    
    // Create hex dumps
    const hexDump = this.createHexDumps(uint8Array);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      formatDetection,
      screpJsCompatibility,
      customParserResults
    });
    console.log('[ReplayAnalyzer] Generated recommendations:', recommendations);
    
    return {
      fileInfo,
      formatDetection,
      screpJsCompatibility,
      customParserResults,
      hexDump,
      recommendations
    };
  }
  
  private analyzeFormat(data: Uint8Array): ReplayAnalysisResult['formatDetection'] {
    // Read magic bytes
    const magic = Array.from(data.slice(0, 4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Detect compression and format using enhanced detector
    const compressionInfo = CompressionDetector.detectFormat(data.buffer);
    
    // Improved version estimation based on compression info AND magic bytes
    let estimatedVersion = 'Unknown';
    
    // Use the compression detector's results
    if (compressionInfo.type === 'seRS') {
      estimatedVersion = 'StarCraft: Remastered (1.18+)';
    } else if (compressionInfo.type === 'zlib') {
      estimatedVersion = 'Compressed (Classic/Remastered)';
    } else if (magic === '5453494c') { // "LIST" in hex
      estimatedVersion = 'Compressed (Classic/Remastered)';
    } else if (data.length > 633 && data[0] !== 0) {
      // Fallback to legacy detection for uncompressed files
      const versionArea = data.slice(4, 8);
      if (versionArea.length >= 4) {
        const versionValue = new DataView(versionArea.buffer, versionArea.byteOffset).getUint32(0, true);
        
        if (versionValue >= 74) {
          estimatedVersion = 'StarCraft: Remastered (1.18+)';
        } else if (versionValue >= 59) {
          estimatedVersion = 'StarCraft: Brood War (1.16.1)';
        } else {
          estimatedVersion = 'StarCraft: Classic';
        }
      }
    }
    
    return {
      magic: `0x${magic}`,
      isCompressed: compressionInfo.needsDecompression,
      detectedFormat: compressionInfo.type,
      estimatedVersion
    };
  }
  
  private async testScrepJs(file: File): Promise<ReplayAnalysisResult['screpJsCompatibility']> {
    try {
      const wrapper = ScrepJsWrapper.getInstance();
      const available = await wrapper.initialize();
      
      if (!available) {
        return {
          available: false,
          parseSuccess: false,
          error: 'screp-js not available in browser'
        };
      }
      
      const result = await wrapper.parseReplay(file);
      
      return {
        available: true,
        parseSuccess: true,
        resultKeys: Object.keys(result)
      };
      
    } catch (error) {
      return {
        available: true,
        parseSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async testCustomParser(arrayBuffer: ArrayBuffer): Promise<ReplayAnalysisResult['customParserResults']> {
    try {
      const parser = new BWRemasteredParser(arrayBuffer);
      const result = await parser.parseReplay();
      
      return {
        parseSuccess: true,
        extractedData: {
          mapName: result.mapName,
          playersFound: result.players.length,
          playerNames: result.players.map(p => p.name),
          totalFrames: result.totalFrames,
          duration: result.duration,
          commandsFound: result.commands.length
        }
      };
      
    } catch (error) {
      return {
        parseSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private createHexDumps(data: Uint8Array): ReplayAnalysisResult['hexDump'] {
    const createHexDump = (offset: number, length: number, label: string) => {
      const bytes = data.slice(offset, offset + length);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(bytes).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
      return `${label} (0x${offset.toString(16)}):\n${hex}\nASCII: ${ascii}`;
    };
    
    return {
      first256Bytes: createHexDump(0, Math.min(256, data.length), 'File Header'),
      playerDataSection: createHexDump(0x161, Math.min(144, data.length - 0x161), 'Player Data Area'),
      commandsSection: createHexDump(633, Math.min(128, data.length - 633), 'Commands Start')
    };
  }
  
  private generateRecommendations(analysis: {
    formatDetection: ReplayAnalysisResult['formatDetection'];
    screpJsCompatibility: ReplayAnalysisResult['screpJsCompatibility'];
    customParserResults: ReplayAnalysisResult['customParserResults'];
  }): string[] {
    const recommendations: string[] = [];
    
    if (!analysis.screpJsCompatibility.available) {
      recommendations.push('screp-js ist im Browser nicht verfügbar - Browser-Polyfills prüfen');
    } else if (!analysis.screpJsCompatibility.parseSuccess) {
      recommendations.push('screp-js kann diese Datei nicht parsen - möglicherweise zu neues Format');
    } else {
      recommendations.push('✅ screp-js kann diese Datei erfolgreich parsen - verwende screp-js für normale Analyse');
    }
    
    if (!analysis.customParserResults.parseSuccess) {
      if (analysis.formatDetection.isCompressed) {
        recommendations.push('Custom Parser schlägt fehl da Datei komprimiert ist - Decompression-Module verbessern');
      } else {
        recommendations.push('Custom Parser schlägt fehl - Datei könnte beschädigt oder unsupported sein');
      }
    }
    
    if (analysis.formatDetection.detectedFormat === 'seRS') {
      recommendations.push('✅ Remastered seRS-Format erkannt - verwende seRS-Decompression');
    }
    
    if (analysis.formatDetection.estimatedVersion.includes('Remastered')) {
      recommendations.push('✅ Remastered-Version bestätigt - moderne Parsing-Tools verwenden');
    }
    
    // Add recommendation based on screp-js success vs custom parser failure
    if (analysis.screpJsCompatibility.parseSuccess && !analysis.customParserResults.parseSuccess) {
      recommendations.push('💡 Empfehlung: Nutze "Normal analysieren" statt Custom Parser für beste Ergebnisse');
    }
    
    if (analysis.customParserResults.parseSuccess && analysis.customParserResults.extractedData) {
      const data = analysis.customParserResults.extractedData;
      if (data.playersFound < 2) {
        recommendations.push('Weniger als 2 Spieler gefunden - Player-Parser verbessern');
      }
      if (data.commandsFound === 0) {
        recommendations.push('Keine Commands gefunden - Command-Parser-Offset anpassen');
      }
    }
    
    return recommendations;
  }
}
