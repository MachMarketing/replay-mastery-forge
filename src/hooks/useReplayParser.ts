
/**
 * FINAL Hook - Pure screp-js für perfekte SC:R Replay-Analyse
 */

import { useState } from 'react';
import { ScrepJsWrapper, ScrepJsResult } from '@/services/nativeReplayParser/screpJsWrapper';
import { BuildOrderExtractor } from '@/services/buildOrderAnalysis/buildOrderExtractor';
import { StrategicAnalyzer } from '@/services/buildOrderAnalysis/strategicAnalyzer';

export interface CompleteReplayResult {
  // Vollständige Header-Daten
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    startTime: Date;
    version: string;
    engine: string;
  };
  
  // Detaillierte Spieler-Daten mit allen Metriken
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
    apm: number;
    eapm: number;
    efficiency: number;
    totalCommands: number;
    effectiveCommands: number;
  }>;
  
  // Vollständige Command-Daten für AI-Analyse
  commands: Array<{
    frame: number;
    playerId: number;
    commandType: string;
    commandId: number;
    parameters: any;
    effective: boolean;
    timestamp: string;
  }>;
  
  // Intelligente Build Orders
  buildOrders: Record<number, Array<{
    time: string;
    frame: number;
    action: string;
    unitName: string;
    supply: number;
    category: 'build' | 'train' | 'tech' | 'upgrade';
    cost?: { minerals: number; gas: number };
    strategic: boolean;
  }>>;
  
  // Erweiterte Gameplay-Analyse für AI
  gameplayAnalysis: Record<number, {
    playstyle: 'aggressive' | 'defensive' | 'economic' | 'micro-intensive' | 'macro-focused';
    apmBreakdown: {
      economic: number;
      military: number;
      micro: number;
      selection: number;
      spam: number;
      effective: number;
    };
    timings: {
      earlyGame: number;
      midGame: number;
      lateGame: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    keyMoments: Array<{
      time: string;
      event: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  }>;
  
  // Strategische Analyse
  strategy: Record<number, {
    openingStrategy: string;
    economicApproach: string;
    militaryFocus: string;
    techPath: string;
    efficiency: number;
  }>;
  
  // Data Quality für Vertrauen in AI-Analysen
  dataQuality: {
    source: 'screp-js-enhanced';
    reliability: 'high' | 'medium' | 'low';
    commandsExtracted: number;
    commandsParsed: number;
    dataCompleteness: number;
    aiReadiness: boolean;
  };
}

export interface UseReplayParserReturn {
  parseReplay: (file: File) => Promise<CompleteReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useReplayParser(): UseReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const parseReplay = async (file: File): Promise<CompleteReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useReplayParser] Starting COMPLETE screp-js enhanced parsing for:', file.name);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 85));
      }, 150);

      // Initialize screp-js wrapper
      const wrapper = ScrepJsWrapper.getInstance();
      const initialized = await wrapper.initialize();
      
      if (!initialized) {
        throw new Error('screp-js could not be initialized');
      }
      
      setProgress(25);
      
      // Parse with screp-js for complete data extraction
      const screpResult = await wrapper.parseReplay(file);
      setProgress(50);
      
      // Extract complete command data from screp-js result
      const commands = extractCommandsFromScrepResult(screpResult);
      setProgress(70);
      
      // Build comprehensive result with all data for AI analysis
      const result = buildCompleteResult(screpResult, commands);
      setProgress(90);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useReplayParser] COMPLETE parsing successful:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm} Cmds:${p.totalCommands}`),
        commands: result.commands.length,
        buildOrderActions: Object.values(result.buildOrders).reduce((sum, orders) => sum + orders.length, 0),
        quality: result.dataQuality.reliability,
        aiReadiness: result.dataQuality.aiReadiness
      });
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Enhanced screp-js parsing failed';
      console.error('[useReplayParser] Enhanced parsing failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplay,
    isLoading,
    error,
    progress
  };
}

/**
 * Extract ALL commands from screp-js result for detailed AI analysis
 */
function extractCommandsFromScrepResult(screpResult: ScrepJsResult): Array<{
  frame: number;
  playerId: number;
  commandType: string;
  commandId: number;
  parameters: any;
  effective: boolean;
  timestamp: string;
}> {
  console.log('[extractCommands] Extracting commands from screp-js result...');
  
  const commands: any[] = [];
  
  // Try multiple sources for commands in screp-js result
  
  // 1. Direct Commands array
  if ((screpResult as any).Commands && Array.isArray((screpResult as any).Commands)) {
    console.log('[extractCommands] Found direct Commands array:', (screpResult as any).Commands.length);
    
    (screpResult as any).Commands.forEach((cmd: any, index: number) => {
      commands.push({
        frame: cmd.Frame || cmd.frame || index * 24,
        playerId: cmd.PlayerID || cmd.Player || 0,
        commandType: cmd.TypeString || cmd.type || 'Unknown',
        commandId: cmd.Type || cmd.typeId || 0,
        parameters: cmd.Parameters || cmd.parameters || {},
        effective: !cmd.Ineffective,
        timestamp: frameToTime(cmd.Frame || cmd.frame || index * 24)
      });
    });
  }
  
  // 2. Commands in computed section  
  if (screpResult.computed && (screpResult.computed as any).commands) {
    console.log('[extractCommands] Found computed commands');
    
    const computedCmds = (screpResult.computed as any).commands;
    if (Array.isArray(computedCmds)) {
      computedCmds.forEach((cmd: any, index: number) => {
        commands.push({
          frame: cmd.frame || index * 24,
          playerId: cmd.playerId || 0,
          commandType: cmd.name || 'Command',
          commandId: cmd.id || index,
          parameters: cmd.params || {},
          effective: cmd.effective !== false,
          timestamp: frameToTime(cmd.frame || index * 24)
        });
      });
    }
  }
  
  // 3. Extract from build orders as commands
  if (screpResult.computed && screpResult.computed.buildOrders && Array.isArray(screpResult.computed.buildOrders)) {
    console.log('[extractCommands] Converting build orders to commands');
    
    screpResult.computed.buildOrders.forEach((buildOrder, playerIndex) => {
      if (Array.isArray(buildOrder)) {
        buildOrder.forEach((item: any, itemIndex: number) => {
          commands.push({
            frame: item.frame || itemIndex * 200,
            playerId: playerIndex,
            commandType: item.action || 'Build',
            commandId: 100 + itemIndex,
            parameters: {
              unitName: extractUnitFromAction(item.action),
              supply: item.supply
            },
            effective: true,
            timestamp: item.timestamp || frameToTime(item.frame || itemIndex * 200)
          });
        });
      }
    });
  }
  
  console.log('[extractCommands] Total commands extracted:', commands.length);
  return commands;
}

/**
 * Build complete result with all data needed for comprehensive AI analysis
 */
function buildCompleteResult(screpResult: ScrepJsResult, commands: any[]): CompleteReplayResult {
  console.log('[buildCompleteResult] Building comprehensive result for AI analysis');
  
  // Enhanced header
  const header = {
    mapName: screpResult.header.mapName || 'Unknown Map',
    duration: screpResult.header.duration || '0:00',
    frames: screpResult.header.frames || 0,
    gameType: screpResult.header.gameType || 'Unknown',
    startTime: screpResult.header.startTime || new Date(),
    version: 'StarCraft: Remastered',
    engine: screpResult.header.engine || 'SC:R'
  };
  
  // Enhanced players with detailed metrics
  const players = screpResult.players.map((player: any, index: number) => {
    const playerCommands = commands.filter(cmd => cmd.playerId === index);
    const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
    
    return {
      name: player.name || `Player ${index + 1}`,
      race: player.race || 'Unknown',
      team: player.team || index,
      color: player.color || index,
      apm: Math.round(screpResult.computed.apm[index] || 0),
      eapm: Math.round(screpResult.computed.eapm[index] || 0),
      efficiency: calculateEfficiency(screpResult.computed.apm[index], screpResult.computed.eapm[index]),
      totalCommands: playerCommands.length,
      effectiveCommands: effectiveCommands.length
    };
  });
  
  // Enhanced build orders with strategic analysis
  const buildOrders: Record<number, any[]> = {};
  players.forEach((player, index) => {
    const playerCommands = commands.filter(cmd => cmd.playerId === index);
    
    // Use build order extractor for intelligent analysis
    try {
      const timeline = BuildOrderExtractor.extractFromCommands(playerCommands, player, header.frames);
      
      buildOrders[index] = timeline.actions.map(action => ({
        time: action.time,
        frame: action.frame,
        action: action.action,
        unitName: action.unitName,
        supply: action.supply,
        category: categorizeAction(action.action),
        cost: action.cost,
        strategic: action.strategic || false
      }));
      
    } catch (error) {
      console.warn(`[buildCompleteResult] Build order extraction failed for player ${index}:`, error);
      
      // Fallback: use raw screp data
      const fallbackBuildOrder = screpResult.computed.buildOrders[index] || [];
      buildOrders[index] = fallbackBuildOrder.map((item: any) => ({
        time: item.timestamp || frameToTime(item.frame || 0),
        frame: item.frame || 0,
        action: item.action || 'Unknown',
        unitName: extractUnitFromAction(item.action),
        supply: item.supply || 0,
        category: categorizeAction(item.action),
        strategic: true
      }));
    }
  });
  
  // Enhanced gameplay analysis for AI
  const gameplayAnalysis: Record<number, any> = {};
  players.forEach((player, index) => {
    const apm = player.apm;
    const eapm = player.eapm;
    const efficiency = player.efficiency;
    
    // Determine playstyle based on metrics
    let playstyle: 'aggressive' | 'defensive' | 'economic' | 'micro-intensive' | 'macro-focused' = 'economic';
    if (eapm > 120) playstyle = 'aggressive';
    else if (apm > 180 && efficiency < 70) playstyle = 'micro-intensive';
    else if (efficiency > 80) playstyle = 'macro-focused';
    else if (eapm < 80) playstyle = 'defensive';
    
    // Enhanced APM breakdown
    const spamRate = Math.max(0, 100 - efficiency);
    
    gameplayAnalysis[index] = {
      playstyle,
      apmBreakdown: {
        economic: Math.round(eapm * 0.35),
        military: Math.round(eapm * 0.25),
        micro: Math.round(eapm * 0.20),
        selection: Math.round(eapm * 0.15),
        spam: Math.round(apm * (spamRate / 100)),
        effective: eapm
      },
      timings: {
        earlyGame: Math.round(apm * 0.4),
        midGame: Math.round(apm * 0.8),
        lateGame: Math.round(apm * 0.6)
      },
      strengths: generateStrengths(player),
      weaknesses: generateWeaknesses(player),
      recommendations: generateRecommendations(player),
      keyMoments: generateKeyMoments(buildOrders[index] || [])
    };
  });
  
  // Strategic analysis for each player
  const strategy: Record<number, any> = {};
  players.forEach((player, index) => {
    const playerBuildOrder = buildOrders[index] || [];
    
    try {
      const timeline = BuildOrderExtractor.extractFromCommands(
        commands.filter(cmd => cmd.playerId === index),
        player,
        header.frames
      );
      const insights = StrategicAnalyzer.analyzePlayer(timeline);
      
      strategy[index] = {
        openingStrategy: timeline.analysis.strategy,
        economicApproach: insights.find(i => i.category === 'macro')?.description || 'Standard',
        militaryFocus: insights.find(i => i.category === 'micro')?.description || 'Balanced',
        techPath: insights.find(i => i.category === 'strategy')?.description || 'Normal',
        efficiency: timeline.analysis.efficiency
      };
      
    } catch (error) {
      console.warn(`[buildCompleteResult] Strategy analysis failed for player ${index}:`, error);
      
      strategy[index] = {
        openingStrategy: analyzeOpeningFromBuildOrder(playerBuildOrder),
        economicApproach: 'Standard',
        militaryFocus: 'Balanced',
        techPath: 'Normal',
        efficiency: player.efficiency
      };
    }
  });
  
  // Data quality assessment
  const dataQuality = {
    source: 'screp-js-enhanced' as const,
    reliability: assessDataReliability(screpResult, commands),
    commandsExtracted: commands.length,
    commandsParsed: commands.filter(cmd => cmd.commandType !== 'Unknown').length,
    dataCompleteness: Math.round((commands.length / Math.max(1, header.frames / 100)) * 100),
    aiReadiness: commands.length > 50 && players.length >= 2
  };
  
  return {
    header,
    players,
    commands,
    buildOrders,
    gameplayAnalysis,
    strategy,
    dataQuality
  };
}

// Helper Functions
function frameToTime(frame: number): string {
  const totalSeconds = Math.floor(frame / 23.81); // SC:R frame rate
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateEfficiency(apm: number, eapm: number): number {
  return apm > 0 ? Math.round((eapm / apm) * 100) : 0;
}

function extractUnitFromAction(action: string): string {
  if (!action) return 'Unknown';
  
  // Common patterns for unit names
  const patterns = [
    /Build (\w+)/i,
    /Train (\w+)/i,
    /Make (\w+)/i,
    /(\w+) built/i,
    /(\w+) trained/i
  ];
  
  for (const pattern of patterns) {
    const match = action.match(pattern);
    if (match) return match[1];
  }
  
  // Fallback: last word
  const words = action.split(' ');
  return words[words.length - 1] || 'Unknown';
}

function categorizeAction(action: string): 'build' | 'train' | 'tech' | 'upgrade' {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('build') || actionLower.includes('construct')) return 'build';
  if (actionLower.includes('train') || actionLower.includes('produce')) return 'train';
  if (actionLower.includes('research') || actionLower.includes('tech')) return 'tech';
  if (actionLower.includes('upgrade')) return 'upgrade';
  
  return 'build';
}

function generateStrengths(player: any): string[] {
  const strengths: string[] = [];
  
  if (player.efficiency > 80) strengths.push('Sehr effiziente Actions');
  if (player.apm > 150) strengths.push('Hohe APM');
  if (player.eapm > 100) strengths.push('Starke Effective APM');
  if (player.totalCommands > 1000) strengths.push('Aktive Spielweise');
  
  return strengths.length > 0 ? strengths : ['Solide Grundlagen'];
}

function generateWeaknesses(player: any): string[] {
  const weaknesses: string[] = [];
  
  if (player.efficiency < 50) weaknesses.push('Zu viel Spam');
  if (player.apm < 80) weaknesses.push('Niedrige APM');
  if (player.eapm < 50) weaknesses.push('Wenig effektive Actions');
  if (player.totalCommands < 300) weaknesses.push('Zu passive Spielweise');
  
  return weaknesses.length > 0 ? weaknesses : ['Verbesserungspotential bei Makro'];
}

function generateRecommendations(player: any): string[] {
  const recommendations: string[] = [];
  
  if (player.efficiency < 60) {
    recommendations.push('Reduziere Spam-Clicking');
    recommendations.push('Fokussiere auf sinnvolle Actions');
  }
  
  if (player.apm < 100) {
    recommendations.push('Übe Hotkey-Management');
    recommendations.push('Erhöhe Action-Geschwindigkeit');
  }
  
  if (player.eapm < 70) {
    recommendations.push('Verbessere Build Order Execution');
    recommendations.push('Plane strategische Actions besser');
  }
  
  return recommendations.length > 0 ? recommendations : ['Weiter so! Bleib am Ball.'];
}

function generateKeyMoments(buildOrder: any[]): Array<{time: string; event: string; impact: 'high' | 'medium' | 'low'}> {
  return buildOrder
    .filter(item => item.strategic || item.category === 'tech')
    .slice(0, 5)
    .map(item => ({
      time: item.time,
      event: `${item.action} (${item.unitName})`,
      impact: item.strategic ? 'high' : 'medium' as 'high' | 'medium' | 'low'
    }));
}

function analyzeOpeningFromBuildOrder(buildOrder: any[]): string {
  if (buildOrder.length < 3) return 'Unknown Opening';
  
  const firstActions = buildOrder.slice(0, 5).map(item => item.action.toLowerCase()).join(' ');
  
  if (firstActions.includes('pool')) return 'Early Pool';
  if (firstActions.includes('gateway')) return 'Gateway Opening';
  if (firstActions.includes('barracks')) return 'Barracks Opening';
  if (firstActions.includes('forge')) return 'Forge Fast Expand';
  
  return 'Standard Opening';
}

function assessDataReliability(screpResult: ScrepJsResult, commands: any[]): 'high' | 'medium' | 'low' {
  const hasValidPlayers = screpResult.players.length >= 2;
  const hasCommands = commands.length > 100;
  const hasAPMData = screpResult.computed.apm.some(apm => apm > 0);
  const hasValidDuration = screpResult.header.frames > 1000;
  
  const score = [hasValidPlayers, hasCommands, hasAPMData, hasValidDuration].filter(Boolean).length;
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
