
/**
 * Enhanced screp-js wrapper with screp-compliant parsing
 */

import { ensureBufferPolyfills, fileToBuffer } from './bufferUtils';
import { ScrepCompliantParser, ScrepParseResult } from './screpCompliantParser';

// Dynamic import for screp-js
let screpJs: any = null;

async function loadScrepJs() {
  if (screpJs) return screpJs;
  
  try {
    const module = await import('screp-js');
    screpJs = module.default || module;
    console.log('[ScrepJsWrapper] screp-js loaded successfully');
    return screpJs;
  } catch (error) {
    console.warn('[ScrepJsWrapper] screp-js not available:', error);
    return null;
  }
}

export interface ReplayParseResult {
  header: {
    engine: string;
    version: string;
    frames: number;
    startTime: Date;
    mapName: string;
    gameType: string;
    duration: string;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  commands: Array<{
    frame: number;
    type: string;
    data: any;
  }>;
  computed: {
    playerAPM: number[];
    playerEAPM: number[];
    buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;
    dataSource: 'screp-js' | 'screp-compliant' | 'hybrid';
  };
}

export class ScrepJsWrapper {
  private static instance: ScrepJsWrapper;
  private screpLib: any = null;
  private isInitialized = false;

  static getInstance(): ScrepJsWrapper {
    if (!ScrepJsWrapper.instance) {
      ScrepJsWrapper.instance = new ScrepJsWrapper();
    }
    return ScrepJsWrapper.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    console.log('[ScrepJsWrapper] ===== INITIALIZING SCREP-COMPLIANT WRAPPER =====');
    
    ensureBufferPolyfills();
    this.screpLib = await loadScrepJs();
    this.isInitialized = true;
    
    console.log('[ScrepJsWrapper] Initialization complete');
    return true;
  }

  async parseReplay(file: File): Promise<ReplayParseResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('[ScrepJsWrapper] ===== STARTING SCREP-COMPLIANT PARSING =====');
    console.log('[ScrepJsWrapper] File:', file.name, 'Size:', file.size);
    
    const buffer = await fileToBuffer(file);
    console.log('[ScrepJsWrapper] Buffer size:', buffer.length);
    
    // Use our screp-compliant parser for accurate data
    console.log('[ScrepJsWrapper] Using screp-compliant parser...');
    const compliantParser = new ScrepCompliantParser(buffer.buffer);
    
    let parseResult: ScrepParseResult;
    try {
      parseResult = await compliantParser.parseReplay();
      console.log('[ScrepJsWrapper] Screp-compliant parsing: SUCCESS');
      
      // Log detailed parsing results
      console.log('[ScrepJsWrapper] === DETAILED PARSING RESULTS ===');
      console.log('[ScrepJsWrapper] Map name:', parseResult.header.mapName);
      console.log('[ScrepJsWrapper] Player names:', parseResult.header.playerNames);
      console.log('[ScrepJsWrapper] Player races:', parseResult.header.playerRaces);
      console.log('[ScrepJsWrapper] Duration:', parseResult.header.duration);
      console.log('[ScrepJsWrapper] APM values:', parseResult.metrics.apm);
      console.log('[ScrepJsWrapper] EAPM values:', parseResult.metrics.eapm);
      
    } catch (error) {
      console.error('[ScrepJsWrapper] Screp-compliant parsing failed:', error);
      throw new Error(`Screp-compliant parsing failed: ${error.message}`);
    }

    // Try to get additional header info from screp-js if available
    let screpHeader: any = null;
    if (this.screpLib) {
      try {
        console.log('[ScrepJsWrapper] Attempting screp-js for additional header info...');
        screpHeader = await this.tryScrepJsHeader(buffer);
        if (screpHeader) {
          console.log('[ScrepJsWrapper] screp-js header extraction: SUCCESS');
        } else {
          console.log('[ScrepJsWrapper] screp-js header extraction: NO ADDITIONAL DATA');
        }
      } catch (error) {
        console.warn('[ScrepJsWrapper] screp-js header extraction failed, using parsed data');
      }
    }

    // Combine results
    return this.combineResults(parseResult, screpHeader);
  }

  private async tryScrepJsHeader(buffer: Uint8Array): Promise<any> {
    const methods = [
      { name: 'parseBuffer', options: { commands: false } },
      { name: 'parseReplay', options: {} }
    ];

    for (const method of methods) {
      if (typeof this.screpLib[method.name] === 'function') {
        try {
          console.log(`[ScrepJsWrapper] Trying ${method.name}...`);
          
          let result;
          if (Object.keys(method.options).length > 0) {
            result = await this.screpLib[method.name](buffer, method.options);
          } else {
            result = await this.screpLib[method.name](buffer);
          }

          if (result && result.Header) {
            console.log(`[ScrepJsWrapper] ${method.name} successful`);
            return result;
          }
        } catch (error) {
          console.warn(`[ScrepJsWrapper] ${method.name} failed:`, error);
        }
      }
    }

    return null;
  }

  private combineResults(parseResult: ScrepParseResult, screpHeader: any): ReplayParseResult {
    console.log('[ScrepJsWrapper] ===== COMBINING SCREP-COMPLIANT RESULTS =====');
    
    // Use screp-compliant data as primary source - NO FALLBACKS
    const players = parseResult.header.playerNames.map((name, index) => ({
      name,
      race: parseResult.header.playerRaces[index] || 'Unknown',
      team: index % 2,
      color: index
    }));

    // If screp-js provided additional header info, use it to enhance map name only
    let mapName = parseResult.header.mapName;
    if (screpHeader?.Header?.Map && screpHeader.Header.Map.trim()) {
      const enhancedMapName = screpHeader.Header.Map.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
      if (enhancedMapName && enhancedMapName !== 'Unknown Map') {
        mapName = enhancedMapName;
        console.log('[ScrepJsWrapper] Enhanced map name from screp-js:', mapName);
      }
    }

    const result: ReplayParseResult = {
      header: {
        engine: 'StarCraft',
        version: 'Remastered',
        frames: parseResult.header.frameCount,
        startTime: new Date(),
        mapName,
        gameType: 'Melee',
        duration: parseResult.header.duration
      },
      players,
      commands: [], // Don't include for performance
      computed: {
        playerAPM: parseResult.metrics.apm,
        playerEAPM: parseResult.metrics.eapm,
        buildOrders: parseResult.buildOrders.map(bo => 
          bo.map(item => ({
            frame: item.frame,
            timestamp: item.timestamp,
            action: item.unitName,
            supply: item.supply
          }))
        ),
        dataSource: screpHeader ? 'hybrid' : 'screp-compliant'
      }
    };

    console.log('[ScrepJsWrapper] ===== FINAL SCREP-COMPLIANT RESULT =====');
    console.log('[ScrepJsWrapper] Data source:', result.computed.dataSource);
    console.log('[ScrepJsWrapper] Map:', result.header.mapName);
    console.log('[ScrepJsWrapper] Players:', result.players.map(p => `${p.name} (${p.race})`));
    console.log('[ScrepJsWrapper] REAL APM:', result.computed.playerAPM);
    console.log('[ScrepJsWrapper] REAL EAPM:', result.computed.playerEAPM);
    console.log('[ScrepJsWrapper] REAL Build Orders:', result.computed.buildOrders.map(bo => `${bo.length} actions`));
    console.log('[ScrepJsWrapper] Total actions processed:', parseResult.actions.length);

    return result;
  }

  isAvailable(): boolean {
    return true;
  }
}
