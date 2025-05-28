
/**
 * Enhanced error handling for StarCraft replay parsing
 * Provides detailed error analysis and recovery suggestions
 */

export interface ParseError {
  type: 'compression' | 'format' | 'corruption' | 'encoding' | 'unknown';
  message: string;
  details: string;
  suggestions: string[];
  recoverable: boolean;
}

export class ReplayParseErrorHandler {
  /**
   * Analyze and categorize parsing errors
   */
  static analyzeError(error: any, file: File): ParseError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fileName = file.name;
    const fileSize = file.size;
    
    console.log('[ErrorHandler] Analyzing error:', errorMessage);
    
    // Compression-related errors
    if (this.isCompressionError(errorMessage)) {
      return {
        type: 'compression',
        message: 'Dekomprimierung der Replay-Datei fehlgeschlagen',
        details: `Die Datei "${fileName}" (${(fileSize/1024).toFixed(1)}KB) konnte nicht dekomprimiert werden.`,
        suggestions: [
          'Stelle sicher, dass die .rep-Datei nicht beschädigt ist',
          'Versuche eine andere Replay-Datei',
          'Prüfe ob die Datei vollständig heruntergeladen wurde'
        ],
        recoverable: true
      };
    }
    
    // Format-related errors
    if (this.isFormatError(errorMessage)) {
      return {
        type: 'format',
        message: 'Unbekanntes oder ungültiges Replay-Format',
        details: `Die Datei "${fileName}" ist kein gültiges StarCraft Replay oder hat ein nicht unterstütztes Format.`,
        suggestions: [
          'Stelle sicher, dass es sich um eine .rep-Datei handelt',
          'Prüfe ob die Datei von StarCraft: Brood War oder Remastered stammt',
          'Lade die Replay-Datei erneut aus dem Spiel herunter'
        ],
        recoverable: false
      };
    }
    
    // File corruption errors
    if (this.isCorruptionError(errorMessage, fileSize)) {
      return {
        type: 'corruption',
        message: 'Replay-Datei ist beschädigt oder unvollständig',
        details: `Die Datei "${fileName}" scheint beschädigt zu sein oder wurde nicht vollständig übertragen.`,
        suggestions: [
          'Lade die Replay-Datei erneut herunter',
          'Prüfe die Datei-Integrität',
          'Versuche eine Backup-Kopie der Replay-Datei'
        ],
        recoverable: true
      };
    }
    
    // Encoding-related errors
    if (this.isEncodingError(errorMessage)) {
      return {
        type: 'encoding',
        message: 'Problem mit der Zeichenkodierung',
        details: `Die Replay-Datei "${fileName}" hat Probleme mit der Zeichenkodierung (möglicherweise koreanische/chinesische Zeichen).`,
        suggestions: [
          'Die Datei ist möglicherweise von einer nicht-westlichen StarCraft Version',
          'Versuche eine andere Replay-Datei',
          'Prüfe die Spracheinstellungen des ursprünglichen Spiels'
        ],
        recoverable: true
      };
    }
    
    // Default unknown error
    return {
      type: 'unknown',
      message: 'Unbekannter Fehler beim Parsing',
      details: `Beim Verarbeiten der Datei "${fileName}" ist ein unerwarteter Fehler aufgetreten: ${errorMessage}`,
      suggestions: [
        'Versuche eine andere Replay-Datei',
        'Aktualisiere deinen Browser',
        'Prüfe ob die Datei gültig ist'
      ],
      recoverable: true
    };
  }
  
  /**
   * Check if error is compression-related
   */
  private static isCompressionError(message: string): boolean {
    const compressionKeywords = [
      'decompress', 'zlib', 'inflate', 'compression',
      'pkware', 'bzip2', 'invalid header', 'corrupt'
    ];
    
    return compressionKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if error is format-related
   */
  private static isFormatError(message: string): boolean {
    const formatKeywords = [
      'magic', 'signature', 'invalid format', 'not a replay',
      'unknown format', 'header', 'invalid file'
    ];
    
    return formatKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if error indicates file corruption
   */
  private static isCorruptionError(message: string, fileSize: number): boolean {
    // Very small files are likely corrupted
    if (fileSize < 100) {
      return true;
    }
    
    const corruptionKeywords = [
      'unexpected end', 'truncated', 'corrupt',
      'invalid data', 'premature end', 'malformed'
    ];
    
    return corruptionKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if error is encoding-related
   */
  private static isEncodingError(message: string): boolean {
    const encodingKeywords = [
      'encoding', 'utf-8', 'character', 'decode',
      'invalid string', 'text decoder'
    ];
    
    return encodingKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Generate user-friendly error message
   */
  static formatErrorForUser(parseError: ParseError): string {
    let message = `❌ ${parseError.message}\n\n`;
    message += `📋 Details: ${parseError.details}\n\n`;
    
    if (parseError.suggestions.length > 0) {
      message += `💡 Lösungsvorschläge:\n`;
      parseError.suggestions.forEach((suggestion, index) => {
        message += `${index + 1}. ${suggestion}\n`;
      });
    }
    
    if (parseError.recoverable) {
      message += `\n🔄 Dieser Fehler kann oft durch erneutes Versuchen behoben werden.`;
    } else {
      message += `\n⚠️ Dieser Fehler deutet auf ein grundlegendes Problem mit der Datei hin.`;
    }
    
    return message;
  }
}
