
/**
 * Detailed replay file analyzer for debugging and format detection
 * NOW USING ONLY screp-js - no custom parser
 */

import { ScrepJsWrapper } from './screpJsWrapper';
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
    extractedData?: {
      mapName: string;
      playersFound: number;
      playerNames: string[];
      totalFrames: number;
      duration: string;
      apm: number[];
      eapm: number[];
    };
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
    console.log('[ReplayAnalyzer] Starting SCREP-JS ONLY analysis of:', file.name);
    
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
    
    // Test screp-js compatibility (enhanced with data extraction)
    const screpJsCompatibility = await this.testScrepJsEnhanced(file);
    console.log('[ReplayAnalyzer] screp-js enhanced test result:', screpJsCompatibility);
    
    // Create hex dumps
    const hexDump = this.createHexDumps(uint8Array);
    
    // Generate recommendations based on screp-js only
    const recommendations = this.generateRecommendations({
      formatDetection,
      screpJsCompatibility
    });
    console.log('[ReplayAnalyzer] Generated recommendations:', recommendations);
    
    return {
      fileInfo,
      formatDetection,
      screpJsCompatibility,
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
    
    // Use the compression detector's results first (more reliable)
    if (compressionInfo.isRemastered) {
      estimatedVersion = compressionInfo.version; // Use the detector's version
    } else if (compressionInfo.type === 'remastered_zlib') {
      estimatedVersion = 'StarCraft: Remastered (1.18+)';
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
    
    // Additional check: if magic bytes don't match standard patterns but we detected remastered format
    if (magic !== '5265706c' && compressionInfo.type === 'remastered_zlib') {
      estimatedVersion = 'StarCraft: Remastered (Compressed)';
    }
    
    return {
      magic: `0x${magic}`,
      isCompressed: compressionInfo.needsDecompression,
      detectedFormat: compressionInfo.type,
      estimatedVersion
    };
  }
  
  private async testScrepJsEnhanced(file: File): Promise<ReplayAnalysisResult['screpJsCompatibility']> {
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
      
      // Extract detailed data for display
      const extractedData = {
        mapName: result.header.mapName || 'Unknown',
        playersFound: result.players.length,
        playerNames: result.players.map(p => p.name),
        totalFrames: result.header.frames || 0,
        duration: result.header.duration || '0:00',
        apm: result.computed.playerAPM || [],
        eapm: result.computed.playerEAPM || []
      };
      
      return {
        available: true,
        parseSuccess: true,
        resultKeys: Object.keys(result),
        extractedData
      };
      
    } catch (error) {
      return {
        available: true,
        parseSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
  }): string[] {
    const recommendations: string[] = [];
    
    if (!analysis.screpJsCompatibility.available) {
      recommendations.push('❌ screp-js ist im Browser nicht verfügbar - Browser-Polyfills prüfen');
    } else if (!analysis.screpJsCompatibility.parseSuccess) {
      recommendations.push('❌ screp-js kann diese Datei nicht parsen - möglicherweise zu neues Format oder beschädigte Datei');
      recommendations.push('🔧 Prüfe ob die .rep-Datei beschädigt ist oder ein unsupported Format hat');
    } else {
      recommendations.push('✅ screp-js kann diese Datei erfolgreich parsen - alle Daten verfügbar');
      
      if (analysis.screpJsCompatibility.extractedData) {
        const data = analysis.screpJsCompatibility.extractedData;
        
        if (data.playersFound >= 2) {
          recommendations.push(`✅ ${data.playersFound} Spieler erfolgreich erkannt: ${data.playerNames.join(', ')}`);
        }
        
        if (data.apm.length > 0) {
          recommendations.push(`✅ APM-Daten verfügbar: ${data.apm.join(', ')}`);
        }
        
        if (data.mapName && data.mapName !== 'Unknown') {
          recommendations.push(`✅ Map erfolgreich erkannt: ${data.mapName}`);
        }
        
        if (data.duration && data.duration !== '0:00') {
          recommendations.push(`✅ Spieldauer verfügbar: ${data.duration}`);
        }
      }
    }
    
    if (analysis.formatDetection.detectedFormat === 'remastered_zlib') {
      recommendations.push('✅ Remastered-Format mit Kompression erkannt - screp-js unterstützt dies vollständig');
    }
    
    if (analysis.formatDetection.estimatedVersion.includes('Remastered')) {
      recommendations.push('✅ Remastered-Version bestätigt - screp-js ist der beste Parser dafür');
    }
    
    // Always recommend using screp-js since custom parser is removed
    recommendations.push('💡 Empfehlung: Verwende die normale Analyse - Custom Parser wurde entfernt');
    
    return recommendations;
  }
}
