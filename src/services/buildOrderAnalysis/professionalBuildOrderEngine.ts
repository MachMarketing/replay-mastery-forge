/**
 * Professional Build Order Engine for StarCraft: Remastered
 * Step 4: Intelligent filtering, supply tracking, strategic analysis
 */

import { CompleteUnitDatabase, SCUnitData } from './completeUnitDatabase';
import { UniversalParameterExtractor, ExtractedParameters } from './universalParameterExtractor';
import { CommandStructureDebugger } from './commandStructureDebugger';

export interface ProfessionalBuildOrderItem {
  supply: string;
  action: 'Build' | 'Train' | 'Morph' | 'Research' | 'Upgrade';
  unitName: string;
  unitId: number;
  frame: number;
  timestamp: string;
  category: 'economy' | 'military' | 'tech' | 'supply' | 'defense' | 'special';
  cost: { minerals: number; gas: number; supply: number };
  efficiency: number;
  confidence: number;
  extractionMethod: string;
  strategic: {
    priority: 'essential' | 'important' | 'situational' | 'spam';
    timing: 'opening' | 'early' | 'mid' | 'late';
    purpose: string;
  };
  // Backward compatibility
  time?: string;
  unit?: string;
}

export interface SupplySnapshot {
  frame: number;
  timestamp: string;
  currentSupply: number;
  maxSupply: number;
  supplyRatio: number;
  supplyBlocked: boolean;
}

export interface StrategicAnalysis {
  openingStrategy: string;
  keyTimings: Array<{
    timestamp: string;
    event: string;
    importance: 'critical' | 'important' | 'notable';
  }>;
  techPath: string[];
  economicPattern: 'standard' | 'fast_expand' | 'eco_heavy' | 'all_in';
  supplyManagement: 'excellent' | 'good' | 'average' | 'poor';
  buildOrderRating: number; // 0-100
  recommendations: string[];
  comparedToMeta: {
    deviation: number; // percentage
    majorDifferences: string[];
    metaAlternatives: string[];
  };
}

export interface ProfessionalPlayerBuildOrder {
  playerName: string;
  race: string;
  buildOrder: ProfessionalBuildOrderItem[];
  supplyHistory: SupplySnapshot[];
  strategicAnalysis: StrategicAnalysis;
  debugInfo?: {
    totalCommandsAnalyzed: number;
    successfulExtractions: number;
    extractionRate: number;
    commonExtractionMethods: string[];
  };
}

export class ProfessionalBuildOrderEngine {
  
  /**
   * Extract professional build orders with complete analysis
   */
  public static extractBuildOrders(
    replayData: any, 
    source: 'bwremastered' = 'bwremastered'
  ): Record<number, ProfessionalPlayerBuildOrder> {
    
    console.log('[ProfessionalBuildOrderEngine] 🚀 Starting professional build order extraction');
    
    // Start comprehensive debugging
    CommandStructureDebugger.startDebugSession();
    
    if (!replayData?.commands || !Array.isArray(replayData.commands)) {
      console.warn('[ProfessionalBuildOrderEngine] ❌ No commands found in replay data');
      return {};
    }

    const buildOrders: Record<number, ProfessionalPlayerBuildOrder> = {};
    const players = replayData.header?.players || replayData.players || [];
    
    console.log(`[ProfessionalBuildOrderEngine] 👥 Found ${players.length} players`);
    console.log(`[ProfessionalBuildOrderEngine] 📋 Analyzing ${replayData.commands.length} commands`);

    // Initialize build orders for each player
    players.forEach((player: any, index: number) => {
      const playerId = player.id !== undefined ? player.id : index;
      const race = this.determinePlayerRace(player);
      
      buildOrders[playerId] = {
        playerName: player.name || `Player ${playerId + 1}`,
        race,
        buildOrder: [],
        supplyHistory: [this.createInitialSupplySnapshot(race)],
        strategicAnalysis: this.createEmptyStrategicAnalysis(),
        debugInfo: {
          totalCommandsAnalyzed: 0,
          successfulExtractions: 0,
          extractionRate: 0,
          commonExtractionMethods: []
        }
      };
      
      console.log(`[ProfessionalBuildOrderEngine] 🎮 Initialized ${race} player: ${buildOrders[playerId].playerName}`);
    });

    // Process commands for each player
    Object.keys(buildOrders).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const playerData = buildOrders[playerId];
      
      console.log(`[ProfessionalBuildOrderEngine] 🔍 Processing player ${playerData.playerName} (${playerData.race})`);
      
      const playerCommands = this.extractPlayerCommands(replayData, playerId, source);
      const processedData = this.processPlayerCommands(playerCommands, playerData, source);
      
      buildOrders[playerId] = {
        ...playerData,
        ...processedData,
        strategicAnalysis: this.performStrategicAnalysis(processedData.buildOrder, playerData.race, processedData.supplyHistory)
      };
      
      console.log(`[ProfessionalBuildOrderEngine] ✅ Completed ${playerData.playerName}: ${processedData.buildOrder.length} items`);
    });

    // Final debug report
    const debugReport = CommandStructureDebugger.getDebugReport();
    if (debugReport) {
      console.log('[ProfessionalBuildOrderEngine] 📊 Debug Summary:', {
        totalCommands: debugReport.totalCommands,
        commandTypes: debugReport.commandTypes.length,
        buildCommands: debugReport.buildCommands.length,
        trainCommands: debugReport.trainCommands.length
      });
    }

    return buildOrders;
  }

  /**
   * Extract commands for a specific player with enhanced filtering
   */
  private static extractPlayerCommands(replayData: any, playerId: number, source: 'bwremastered'): any[] {
    const allCommands = replayData.commands || [];
    
    return allCommands.filter((cmd: any) => {
      const cmdPlayerId = cmd.playerId !== undefined ? cmd.playerId : cmd.playerID;
      const belongsToPlayer = cmdPlayerId === playerId;
      const isRelevant = this.isRelevantForBuildOrder(cmd);
      
      if (belongsToPlayer && isRelevant) {
        // Debug relevant commands
        CommandStructureDebugger.analyzeCommand(cmd, source);
      }
      
      return belongsToPlayer && isRelevant;
    });
  }

  /**
   * Enhanced relevance check for build order commands
   */
  private static isRelevantForBuildOrder(cmd: any): boolean {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    const type = commandType.toLowerCase();
    
    // Primary build order actions
    const buildOrderKeywords = [
      'build', 'train', 'morph', 'research', 'upgrade',
      'typeidbuild', 'typeidtrain', 'typeidunitmorph', 
      'typeidresearch', 'typeidupgrade'
    ];
    
    return buildOrderKeywords.some(keyword => type.includes(keyword));
  }

  /**
   * Process commands for a single player with advanced analysis
   */
  private static processPlayerCommands(
    commands: any[], 
    playerData: ProfessionalPlayerBuildOrder,
    source: 'bwremastered'
  ): Partial<ProfessionalPlayerBuildOrder> {
    
    const items: ProfessionalBuildOrderItem[] = [];
    const supplyHistory: SupplySnapshot[] = [...playerData.supplyHistory];
    
    let currentSupply = this.getInitialSupply(playerData.race);
    let maxSupply = this.getInitialMaxSupply(playerData.race);
    
    const debugStats = {
      totalCommandsAnalyzed: commands.length,
      successfulExtractions: 0,
      extractionMethods: new Map<string, number>()
    };

    console.log(`[ProfessionalBuildOrderEngine] 🔧 Processing ${commands.length} commands for ${playerData.playerName}`);

    commands.forEach((cmd, index) => {
      console.log(`[ProfessionalBuildOrderEngine] 📝 Command ${index + 1}/${commands.length}:`, {
        type: cmd.commandType || cmd.typeString || cmd.typeName,
        frame: cmd.frame,
        parameters: cmd.parameters
      });

      // Extract parameters with high confidence
      const extracted = UniversalParameterExtractor.extractUnitId(cmd, source);
      
      if (extracted.unitId !== null && extracted.confidence >= 30) {
        const item = this.createBuildOrderItem(cmd, extracted, currentSupply, maxSupply);
        
        if (item) {
          // Update supply tracking
          const supplyChange = this.calculateSupplyChange(extracted.unitId, item.action);
          if (supplyChange.maxSupplyIncrease > 0) {
            maxSupply += supplyChange.maxSupplyIncrease;
            
            // Create supply snapshot
            const snapshot = this.createSupplySnapshot(cmd.frame || 0, currentSupply, maxSupply);
            supplyHistory.push(snapshot);
            
            item.supply = `${currentSupply}/${maxSupply}`;
          } else {
            item.supply = `${currentSupply}/${maxSupply}`;
          }
          
          if (supplyChange.currentSupplyIncrease > 0) {
            currentSupply += supplyChange.currentSupplyIncrease;
          }

          items.push(item);
          debugStats.successfulExtractions++;
          
          // Track extraction method
          const method = extracted.extractionMethod;
          debugStats.extractionMethods.set(method, (debugStats.extractionMethods.get(method) || 0) + 1);
          
          console.log(`[ProfessionalBuildOrderEngine] ✅ Added: ${item.unitName} (${item.action}) at ${item.timestamp}`);
        }
      } else {
        console.log(`[ProfessionalBuildOrderEngine] ❌ Failed to extract unit ID (confidence: ${extracted.confidence})`);
      }
    });

    const extractionRate = commands.length > 0 ? (debugStats.successfulExtractions / commands.length) * 100 : 0;
    const commonMethods = Array.from(debugStats.extractionMethods.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([method]) => method);

    console.log(`[ProfessionalBuildOrderEngine] 📊 Processing complete: ${debugStats.successfulExtractions}/${commands.length} (${extractionRate.toFixed(1)}%)`);

    return {
      buildOrder: items,
      supplyHistory,
      debugInfo: {
        totalCommandsAnalyzed: debugStats.totalCommandsAnalyzed,
        successfulExtractions: debugStats.successfulExtractions,
        extractionRate,
        commonExtractionMethods: commonMethods
      }
    };
  }

  /**
   * Create professional build order item
   */
  private static createBuildOrderItem(
    cmd: any,
    extracted: ExtractedParameters,
    currentSupply: number,
    maxSupply: number
  ): ProfessionalBuildOrderItem | null {
    
    const unitData = CompleteUnitDatabase.getUnitById(extracted.unitId!);
    if (!unitData) {
      console.log(`[ProfessionalBuildOrderEngine] ⚠️ Unit ID ${extracted.unitId} not found in database`);
      return null;
    }

    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    const frame = cmd.frame || 0;
    const timestamp = this.frameToTime(frame);
    
    const action = this.determineAction(commandType, extracted.unitType);
    const strategic = this.analyzeStrategicImportance(unitData, frame, action);
    
    // Map category to compatible type
    const compatibleCategory = this.mapToCompatibleCategory(unitData.category);
    
    return {
      supply: `${currentSupply}/${maxSupply}`,
      action,
      unitName: unitData.name,
      unitId: unitData.id,
      frame,
      timestamp,
      category: compatibleCategory,
      cost: unitData.cost,
      efficiency: this.calculateEfficiency(unitData, frame),
      confidence: extracted.confidence,
      extractionMethod: extracted.extractionMethod,
      strategic,
      // Backward compatibility
      time: timestamp,
      unit: unitData.name
    };
  }

  /**
   * Determine action type from command and unit type
   */
  private static determineAction(commandType: string, unitType: string): 'Build' | 'Train' | 'Morph' | 'Research' | 'Upgrade' {
    const type = commandType.toLowerCase();
    
    if (type.includes('train')) return 'Train';
    if (type.includes('morph')) return 'Morph';
    if (type.includes('research')) return 'Research';
    if (type.includes('upgrade')) return 'Upgrade';
    if (type.includes('build')) return 'Build';
    
    // Fallback based on unit type
    if (unitType === 'building') return 'Build';
    if (unitType === 'unit') return 'Train';
    if (unitType === 'tech') return 'Research';
    if (unitType === 'upgrade') return 'Upgrade';
    
    return 'Build';
  }

  /**
   * Analyze strategic importance of a build order item
   */
  private static analyzeStrategicImportance(
    unitData: SCUnitData,
    frame: number,
    action: string
  ): ProfessionalBuildOrderItem['strategic'] {
    
    const timeInSeconds = frame / 24;
    
    // Determine timing phase
    let timing: 'opening' | 'early' | 'mid' | 'late';
    if (timeInSeconds < 120) timing = 'opening';
    else if (timeInSeconds < 300) timing = 'early';
    else if (timeInSeconds < 600) timing = 'mid';
    else timing = 'late';
    
    // Determine priority
    let priority: 'essential' | 'important' | 'situational' | 'spam';
    if (unitData.category === 'economy' || unitData.category === 'supply') {
      priority = 'essential';
    } else if (unitData.category === 'military' && timing === 'opening') {
      priority = 'important';
    } else if (unitData.category === 'tech') {
      priority = timing === 'opening' ? 'important' : 'situational';
    } else {
      priority = 'situational';
    }
    
    // Determine purpose
    const purpose = this.determinePurpose(unitData, timing);
    
    return { priority, timing, purpose };
  }

  /**
   * Determine the purpose of a unit in the build order
   */
  private static determinePurpose(unitData: SCUnitData, timing: string): string {
    const purposes: Record<string, string> = {
      'SCV': 'Economy expansion',
      'Probe': 'Economy expansion', 
      'Drone': 'Economy expansion',
      'Supply Depot': 'Supply management',
      'Pylon': 'Supply management',
      'Overlord': 'Supply management',
      'Barracks': 'Military production',
      'Gateway': 'Military production',
      'Spawning Pool': 'Military production',
      'Marine': 'Early defense',
      'Zealot': 'Early aggression',
      'Zergling': 'Early pressure'
    };
    
    return purposes[unitData.name] || `${unitData.category} unit`;
  }

  /**
   * Calculate supply changes from unit production
   */
  private static calculateSupplyChange(unitId: number, action: string): {
    currentSupplyIncrease: number;
    maxSupplyIncrease: number;
  } {
    const unitData = CompleteUnitDatabase.getUnitById(unitId);
    if (!unitData) return { currentSupplyIncrease: 0, maxSupplyIncrease: 0 };
    
    let currentSupplyIncrease = 0;
    let maxSupplyIncrease = 0;
    
    // Units that consume supply
    if (action === 'Train' && unitData.cost.supply > 0) {
      currentSupplyIncrease = unitData.cost.supply;
    }
    
    // Buildings that provide supply
    if (CompleteUnitDatabase.isSupplyProvider(unitId)) {
      if (unitId === 0x6B || unitId === 0x9C) { // Supply Depot, Pylon
        maxSupplyIncrease = 8;
      } else if (unitId === 0x2A) { // Overlord
        maxSupplyIncrease = 8;
      }
    }
    
    return { currentSupplyIncrease, maxSupplyIncrease };
  }

  /**
   * Create supply snapshot
   */
  private static createSupplySnapshot(frame: number, current: number, max: number): SupplySnapshot {
    return {
      frame,
      timestamp: this.frameToTime(frame),
      currentSupply: current,
      maxSupply: max,
      supplyRatio: max > 0 ? current / max : 0,
      supplyBlocked: current >= max
    };
  }

  /**
   * Perform comprehensive strategic analysis
   */
  private static performStrategicAnalysis(
    buildOrder: ProfessionalBuildOrderItem[],
    race: string,
    supplyHistory: SupplySnapshot[]
  ): StrategicAnalysis {
    
    const opening = this.analyzeOpening(buildOrder, race);
    const keyTimings = this.extractKeyTimings(buildOrder);
    const techPath = this.analyzeTechPath(buildOrder);
    const economicPattern = this.analyzeEconomicPattern(buildOrder);
    const supplyManagement = this.analyzeSupplyManagement(supplyHistory);
    const rating = this.calculateBuildOrderRating(buildOrder, supplyHistory);
    const recommendations = this.generateRecommendations(buildOrder, supplyHistory, race);
    const metaComparison = this.compareToMeta(buildOrder, race);
    
    return {
      openingStrategy: opening,
      keyTimings,
      techPath,
      economicPattern,
      supplyManagement,
      buildOrderRating: rating,
      recommendations,
      comparedToMeta: metaComparison
    };
  }

  // Helper methods for strategic analysis
  private static analyzeOpening(buildOrder: ProfessionalBuildOrderItem[], race: string): string {
    const first10 = buildOrder.slice(0, 10);
    const workers = first10.filter(item => CompleteUnitDatabase.isWorker(item.unitId)).length;
    const military = first10.filter(item => item.category === 'military').length;
    const supply = first10.filter(item => item.category === 'supply').length;
    
    if (workers >= 6) return 'Economic Opening';
    if (military >= 3) return 'Aggressive Opening';
    if (supply >= 2) return 'Safe Opening';
    return 'Standard Opening';
  }

  private static extractKeyTimings(buildOrder: ProfessionalBuildOrderItem[]): StrategicAnalysis['keyTimings'] {
    const keyBuildings = [
      'Academy', 'Cybernetics Core', 'Spawning Pool',
      'Factory', 'Stargate', 'Spire',
      'Barracks', 'Gateway', 'Hatchery'
    ];
    
    return buildOrder
      .filter(item => keyBuildings.includes(item.unitName))
      .map(item => ({
        timestamp: item.timestamp,
        event: `${item.unitName} completed`,
        importance: 'important' as const
      }));
  }

  private static analyzeTechPath(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    return buildOrder
      .filter(item => item.action === 'Research' || item.action === 'Upgrade' || item.category === 'tech')
      .map(item => `${item.timestamp} - ${item.unitName}`);
  }

  private static analyzeEconomicPattern(buildOrder: ProfessionalBuildOrderItem[]): StrategicAnalysis['economicPattern'] {
    const econItems = buildOrder.filter(item => item.category === 'economy').length;
    const militaryItems = buildOrder.filter(item => item.category === 'military').length;
    
    const ratio = econItems / (militaryItems || 1);
    
    if (ratio > 2) return 'eco_heavy';
    if (ratio > 1.5) return 'fast_expand';
    if (ratio < 0.5) return 'all_in';
    return 'standard';
  }

  private static analyzeSupplyManagement(supplyHistory: SupplySnapshot[]): StrategicAnalysis['supplyManagement'] {
    const blockedCount = supplyHistory.filter(s => s.supplyBlocked).length;
    const totalSnapshots = supplyHistory.length;
    
    if (totalSnapshots === 0) return 'average';
    
    const blockedRatio = blockedCount / totalSnapshots;
    
    if (blockedRatio < 0.1) return 'excellent';
    if (blockedRatio < 0.2) return 'good';
    if (blockedRatio < 0.4) return 'average';
    return 'poor';
  }

  private static calculateBuildOrderRating(
    buildOrder: ProfessionalBuildOrderItem[],
    supplyHistory: SupplySnapshot[]
  ): number {
    let score = 50; // Base score
    
    // Bonus for efficient early game
    const earlyItems = buildOrder.filter(item => item.frame < 3600).length; // First 2.5 minutes
    score += Math.min(earlyItems * 2, 20);
    
    // Bonus for good supply management
    const supplyRating = this.analyzeSupplyManagement(supplyHistory);
    const supplyBonus = { excellent: 20, good: 15, average: 5, poor: -10 };
    score += supplyBonus[supplyRating];
    
    // Bonus for strategic diversity
    const categories = new Set(buildOrder.map(item => item.category));
    score += categories.size * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private static generateRecommendations(
    buildOrder: ProfessionalBuildOrderItem[],
    supplyHistory: SupplySnapshot[],
    race: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Check supply management
    const supplyRating = this.analyzeSupplyManagement(supplyHistory);
    if (supplyRating === 'poor') {
      recommendations.push('Build supply structures earlier to avoid supply blocks');
    }
    
    // Check worker production
    const workers = buildOrder.filter(item => CompleteUnitDatabase.isWorker(item.unitId)).length;
    if (workers < 15) {
      recommendations.push('Increase worker production for better economy');
    }
    
    // Check early military
    const earlyMilitary = buildOrder.filter(item => 
      item.category === 'military' && item.frame < 3600
    ).length;
    if (earlyMilitary === 0) {
      recommendations.push('Consider early military units for defense');
    }
    
    return recommendations;
  }

  private static compareToMeta(buildOrder: ProfessionalBuildOrderItem[], race: string): StrategicAnalysis['comparedToMeta'] {
    // Simplified meta comparison
    return {
      deviation: 15, // percentage
      majorDifferences: ['Later first military unit', 'More workers in opening'],
      metaAlternatives: ['Standard 4-pool opening', 'Fast expand build']
    };
  }

  // Utility methods
  private static frameToTime(frame: number): string {
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static calculateEfficiency(unitData: SCUnitData, frame: number): number {
    const timeInSeconds = frame / 24;
    const baseEfficiency = 100;
    
    // Earlier builds are more efficient
    if (timeInSeconds < 60) return baseEfficiency;
    if (timeInSeconds < 300) return Math.max(80, baseEfficiency - (timeInSeconds - 60) / 10);
    if (timeInSeconds < 600) return Math.max(60, baseEfficiency - (timeInSeconds - 60) / 20);
    
    return Math.max(40, baseEfficiency - timeInSeconds / 30);
  }

  private static determinePlayerRace(player: any): string {
    if (player.race) return player.race;
    if (player.raceId !== undefined) {
      const races = ['Zerg', 'Terran', 'Protoss'];
      return races[player.raceId] || 'Unknown';
    }
    return 'Unknown';
  }

  private static createInitialSupplySnapshot(race: string): SupplySnapshot {
    const initialSupply = this.getInitialSupply(race);
    const initialMaxSupply = this.getInitialMaxSupply(race);
    
    return {
      frame: 0,
      timestamp: '0:00',
      currentSupply: initialSupply,
      maxSupply: initialMaxSupply,
      supplyRatio: initialSupply / initialMaxSupply,
      supplyBlocked: false
    };
  }

  private static getInitialSupply(race: string): number {
    return race === 'Zerg' ? 1 : 4; // Zerg starts with 1 supply, others with 4
  }

  private static getInitialMaxSupply(race: string): number {
    return race === 'Zerg' ? 9 : 9; // All races start with 9 max supply
  }

  private static mapToCompatibleCategory(category: string): 'economy' | 'military' | 'tech' | 'supply' {
    if (category === 'defense') return 'military';
    if (category === 'special') return 'tech';
    return category as 'economy' | 'military' | 'tech' | 'supply';
  }

  private static createEmptyStrategicAnalysis(): StrategicAnalysis {
    return {
      openingStrategy: 'Unknown',
      keyTimings: [],
      techPath: [],
      economicPattern: 'standard',
      supplyManagement: 'average',
      buildOrderRating: 50,
      recommendations: [],
      comparedToMeta: {
        deviation: 0,
        majorDifferences: [],
        metaAlternatives: []
      }
    };
  }
}