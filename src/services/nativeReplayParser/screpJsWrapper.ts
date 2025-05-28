/**
 * Updated screp-js wrapper with proper seRS handling
 */

import { ScrepCompliantParser, ScrepParseResult } from './screpCompliantParser';

/**
 * Enhanced screp-js wrapper with screp-compliant parsing
 */

import { ensureBufferPolyfills, fileToBuffer } from './bufferUtils';

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
    
    const buffer = await file.arrayBuffer();
    console.log('[ScrepJsWrapper] Buffer size:', buffer.byteLength);
    
    // Use our screp-compliant parser with seRS support
    console.log('[ScrepJsWrapper] Using screp-compliant parser with seRS support...');
    const compliantParser = new ScrepCompliantParser(buffer);
    
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

    // Convert to ReplayParseResult format
    return this.convertToReplayParseResult(parseResult);
  }

  private convertToReplayParseResult(parseResult: ScrepParseResult): ReplayParseResult {
    console.log('[ScrepJsWrapper] ===== CONVERTING TO ReplayParseResult =====');
    
    const players = parseResult.header.playerNames.map((name, index) => ({
      name,
      race: parseResult.header.playerRaces[index] || 'Unknown',
      team: index % 2,
      color: index
    }));

    const result: ReplayParseResult = {
      header: {
        engine: 'StarCraft',
        version: 'Remastered',
        frames: parseResult.header.frameCount,
        startTime: new Date(),
        mapName: parseResult.header.mapName,
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
        dataSource: 'screp-compliant'
      }
    };

    console.log('[ScrepJsWrapper] ===== FINAL SCREP-COMPLIANT RESULT =====');
    console.log('[ScrepJsWrapper] Map:', result.header.mapName);
    console.log('[ScrepJsWrapper] Players:', result.players.map(p => `${p.name} (${p.race})`));
    console.log('[ScrepJsWrapper] REAL APM:', result.computed.playerAPM);
    console.log('[ScrepJsWrapper] REAL EAPM:', result.computed.playerEAPM);

    return result;
  }

  isAvailable(): boolean {
    return true;
  }
}
