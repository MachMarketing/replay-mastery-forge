
/**
 * Advanced Remastered Command Extractor
 * Nutzt screp-basierte Parsing-Logik für 100% korrekte Daten
 */

import { ScrepBasedActionParser } from './screpBasedActionParser';

export interface RemasteredCommand {
  frame: number;
  timestamp: string;
  playerId: number;
  commandType: number;
  commandName: string;
  data: Uint8Array;
  isAction: boolean;
  isBuild: boolean;
  unitType?: number;
  targetX?: number;
  targetY?: number;
}

export interface RemasteredExtractionResult {
  commands: RemasteredCommand[];
  playerAPM: number[];
  playerEAPM: number[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
  gameVersion: string;
  extractionMethod: string;
}

export class RemasteredCommandExtractor {
  private data: Uint8Array;
  private dataView: DataView;

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Extract commands using screp-based parsing für 100% korrekte Daten
   */
  async extractCommands(playerCount: number, totalFrames: number): Promise<RemasteredExtractionResult> {
    console.log('[RemasteredCommandExtractor] === STARTING SCREP-BASED EXTRACTION ===');
    console.log('[RemasteredCommandExtractor] Data size:', this.data.length, 'bytes');
    console.log('[RemasteredCommandExtractor] Expected players:', playerCount);
    console.log('[RemasteredCommandExtractor] Total frames:', totalFrames);

    try {
      // Use screp-based action parser für korrekte Daten-Extraktion
      console.log('[RemasteredCommandExtractor] Using screp-based action parser...');
      const screpParser = new ScrepBasedActionParser(this.data);
      const screpResult = await screpParser.parseActions(playerCount, totalFrames);
      
      console.log('[RemasteredCommandExtractor] === SCREP PARSING RESULTS ===');
      console.log('[RemasteredCommandExtractor] Actions found:', screpResult.actions.length);
      console.log('[RemasteredCommandExtractor] Real APM:', screpResult.realAPM);
      console.log('[RemasteredCommandExtractor] Real EAPM:', screpResult.realEAPM);
      console.log('[RemasteredCommandExtractor] Build orders lengths:', screpResult.buildOrders.map(bo => bo.length));
      console.log('[RemasteredCommandExtractor] Parsing method:', screpResult.parsingMethod);
      
      // Validate screp results
      if (this.validateScrepResults(screpResult, playerCount)) {
        console.log('[RemasteredCommandExtractor] Screp results validated successfully!');
        
        // Convert to our format
        const commands: RemasteredCommand[] = screpResult.actions.map(action => ({
          frame: action.frame,
          timestamp: action.timestamp,
          playerId: action.playerId,
          commandType: action.opcode,
          commandName: action.actionName,
          data: new Uint8Array([action.opcode]),
          isAction: action.isRealAction,
          isBuild: action.isBuildAction || action.isTrainAction,
          unitType: action.unitId,
          targetX: action.x,
          targetY: action.y
        }));

        return {
          commands,
          playerAPM: screpResult.realAPM,
          playerEAPM: screpResult.realEAPM,
          buildOrders: screpResult.buildOrders,
          gameVersion: 'StarCraft: Remastered',
          extractionMethod: screpResult.parsingMethod
        };
      } else {
        console.warn('[RemasteredCommandExtractor] Screp results validation failed');
        throw new Error('Screp parsing results failed validation');
      }
      
    } catch (error) {
      console.error('[RemasteredCommandExtractor] Screp-based extraction failed:', error);
      throw new Error(`Screp-based command extraction failed: ${error.message}`);
    }
  }

  /**
   * Validate screp parsing results
   */
  private validateScrepResults(result: any, playerCount: number): boolean {
    // Check if we have sufficient actions
    const hasEnoughActions = result.actions && result.actions.length >= 50;
    
    // Check if APM values are reasonable
    const hasValidAPM = result.realAPM && 
                       result.realAPM.length >= playerCount && 
                       result.realAPM.every((apm: number) => apm >= 0 && apm <= 1000);
    
    // Check if we have build orders
    const hasBuildOrders = result.buildOrders && 
                          result.buildOrders.length >= playerCount;
    
    // Check if we have real actions (not just UI clicks)
    const realActions = result.actions.filter((action: any) => action.isRealAction);
    const hasRealActions = realActions.length >= 20;
    
    console.log('[RemasteredCommandExtractor] Validation results:', {
      hasEnoughActions: hasEnoughActions,
      hasValidAPM: hasValidAPM,
      hasBuildOrders: hasBuildOrders,
      hasRealActions: hasRealActions,
      totalActions: result.actions?.length || 0,
      realActionsCount: realActions.length,
      apmValues: result.realAPM
    });
    
    return hasEnoughActions && hasValidAPM && hasBuildOrders && hasRealActions;
  }
}
