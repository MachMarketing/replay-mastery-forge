
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import the specific types
import { ParsedReplayData, ExtendedReplayData } from './types';

// Track initialization state
let isInitialized = false;
let parserModule: any = null;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] Parser already initialized');
    return;
  }
  
  try {
    console.log('[browserSafeParser] Initializing screparsed parser');
    
    // Import the screparsed module
    const screparsed = await import('screparsed');
    console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
    
    // Store the module for later use
    parserModule = screparsed;
    isInitialized = true;
    console.log('[browserSafeParser] ✅ Parser initialized successfully');
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse a replay file using the browser-safe screparsed parser
 * Based on the official screparsed documentation
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<ExtendedReplayData> {
  if (!isInitialized || !parserModule) {
    await initBrowserSafeParser();
  }
  
  if (!parserModule) {
    throw new Error('screparsed parser module not available');
  }
  
  console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
  
  try {
    // According to screparsed documentation, we need to use ReplayParser class
    console.log('[browserSafeParser] Using ReplayParser from screparsed');
    
    // Check if ReplayParser exists
    if (typeof parserModule.ReplayParser === 'function') {
      // Create a new ReplayParser instance
      // According to the documentation, we should use fromArrayBuffer method
      const parser = await parserModule.ReplayParser.fromArrayBuffer(data.buffer);
      console.log('[browserSafeParser] Created ReplayParser instance');
      
      // Parse the replay
      const result = parser.parse();
      console.log('[browserSafeParser] Parse successful, result structure:', 
        result ? Object.keys(result).join(', ') : 'null');
      
      // Extract advanced metrics
      const enhancedData = extractAdvancedMetrics(result, parser);
      
      // Log the full structure to help with debugging
      console.log('[browserSafeParser] ReplayParser properties:', Object.getOwnPropertyNames(parser));
      console.log('[browserSafeParser] First-level properties:', Object.keys(result || {}));
      
      // Deep analyze the replay structure for debugging
      deepAnalyzeReplayStructure(result);
      
      return enhancedData;
    } else if (typeof parserModule.ParsedReplay === 'function') {
      // Fallback to ParsedReplay if available
      console.log('[browserSafeParser] Trying ParsedReplay class instead');
      const parsedReplay = new parserModule.ParsedReplay(data);
      const result = parsedReplay.parse ? parsedReplay.parse() : parsedReplay;
      
      console.log('[browserSafeParser] Parse with ParsedReplay successful, result structure:',
        result ? Object.keys(result).join(', ') : 'null');
        
      // Extract advanced metrics
      const enhancedData = extractAdvancedMetrics(result, parsedReplay);
      
      return enhancedData;
    } else {
      console.error('[browserSafeParser] Neither ReplayParser nor ParsedReplay found in screparsed module');
      console.log('[browserSafeParser] Available functions:', 
        Object.keys(parserModule).filter(key => typeof parserModule[key] === 'function').join(', '));
      throw new Error('Required parser classes not available in screparsed module');
    }
  } catch (parseError) {
    console.error('[browserSafeParser] Error parsing replay:', parseError);
    throw parseError;
  }
}

/**
 * Extract advanced metrics from the parsed replay data
 */
function extractAdvancedMetrics(rawData: any, parser: any): ExtendedReplayData {
  console.log('[browserSafeParser] Extracting advanced metrics from replay data');
  
  const enhancedData: ExtendedReplayData = {
    rawData: rawData, // Store the raw data for advanced processing
    
    // Basic information (will be populated by transformer)
    playerName: '',
    opponentName: '',
    playerRace: '',
    opponentRace: '',
    map: '',
    matchup: '',
    duration: '',
    durationMS: 0,
    date: new Date().toISOString(),
    result: 'unknown',
    apm: 0,
    eapm: 0,
    opponentApm: 0,
    opponentEapm: 0,
    buildOrder: [],
    trainingPlan: [],
    
    // Player data structures
    primaryPlayer: {
      name: '',
      race: '',
      apm: 0,
      eapm: 0,
      buildOrder: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    secondaryPlayer: {
      name: '',
      race: '',
      apm: 0,
      eapm: 0,
      buildOrder: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    
    // Analysis results (populated by transformer)
    strengths: [],
    weaknesses: [],
    recommendations: [],
    
    // Advanced metrics (extracted here)
    advancedMetrics: {
      // Build order timing
      buildOrderTiming: extractBuildOrderTiming(rawData),
      
      // Resource collection metrics
      resourceCollection: extractResourceMetrics(rawData),
      
      // Supply management
      supplyManagement: extractSupplyMetrics(rawData),
      
      // Army value and composition
      armyValueOverTime: extractArmyValueData(rawData),
      
      // Production efficiency
      productionEfficiency: extractProductionEfficiency(rawData),
      
      // Expansion timing
      expansionTiming: extractExpansionTiming(rawData),
      
      // Tech path
      techPath: extractTechPath(rawData),
      
      // Scouting data
      scoutingEffectiveness: extractScoutingData(rawData),
      
      // Hotkey usage
      hotkeyUsage: extractHotkeyData(rawData),
      
      // Action distribution
      actionDistribution: extractActionDistribution(rawData)
    }
  };
  
  return enhancedData;
}

/**
 * Extract build order timing data
 */
function extractBuildOrderTiming(rawData: any): any {
  // Default empty data structure
  const defaultData = {
    player1: [],
    player2: []
  };
  
  try {
    console.log('[browserSafeParser] Extracting build order timing');
    const buildEvents = [];
    
    // Check for direct build order data
    if (rawData.players && Array.isArray(rawData.players)) {
      for (let i = 0; i < Math.min(2, rawData.players.length); i++) {
        const player = rawData.players[i];
        if (player.buildOrder && Array.isArray(player.buildOrder) && player.buildOrder.length > 0) {
          defaultData[`player${i+1}`] = player.buildOrder.map(item => ({
            time: item.frame || 0,
            timeFormatted: formatGameTime(item.frame || 0),
            name: item.name || 'Unknown',
            supply: item.supply || 0
          }));
        }
      }
    }
    
    // Check for commands and extract build/train commands
    if (rawData.commands && Array.isArray(rawData.commands)) {
      const buildCommands = rawData.commands.filter(cmd => 
        cmd.type === 'build' || cmd.type === 'train' || 
        (cmd.name && (cmd.name.toLowerCase().includes('build') || cmd.name.toLowerCase().includes('train')))
      );
      
      if (buildCommands.length > 0 && defaultData.player1.length === 0) {
        // Group commands by player
        const player1Commands = buildCommands.filter(cmd => cmd.player === 0 || cmd.player === 1);
        const player2Commands = buildCommands.filter(cmd => cmd.player === 1 || cmd.player === 2);
        
        defaultData.player1 = player1Commands.map(cmd => ({
          time: cmd.frame || 0,
          timeFormatted: formatGameTime(cmd.frame || 0),
          name: cmd.name || 'Unknown',
          supply: cmd.supply || 0
        }));
        
        defaultData.player2 = player2Commands.map(cmd => ({
          time: cmd.frame || 0,
          timeFormatted: formatGameTime(cmd.frame || 0),
          name: cmd.name || 'Unknown',
          supply: cmd.supply || 0
        }));
      }
    }
    
    // If we still don't have data, check for events
    if (rawData.events && Array.isArray(rawData.events) && 
        (defaultData.player1.length === 0 || defaultData.player2.length === 0)) {
      const buildingEvents = rawData.events.filter(event => 
        event.type === 'building_started' || 
        event.type === 'unit_born' || 
        event.type === 'research_started'
      );
      
      if (buildingEvents.length > 0) {
        // Group events by player
        const player1Events = buildingEvents.filter(event => event.player === 0 || event.player === 1);
        const player2Events = buildingEvents.filter(event => event.player === 1 || event.player === 2);
        
        if (defaultData.player1.length === 0) {
          defaultData.player1 = player1Events.map(event => ({
            time: event.frame || 0,
            timeFormatted: formatGameTime(event.frame || 0),
            name: event.name || event.unitType || event.buildingType || 'Unknown',
            supply: event.supply || 0
          }));
        }
        
        if (defaultData.player2.length === 0) {
          defaultData.player2 = player2Events.map(event => ({
            time: event.frame || 0,
            timeFormatted: formatGameTime(event.frame || 0),
            name: event.name || event.unitType || event.buildingType || 'Unknown',
            supply: event.supply || 0
          }));
        }
      }
    }
    
    if (defaultData.player1.length > 0) {
      console.log(`[browserSafeParser] Extracted ${defaultData.player1.length} build events for player 1`);
    }
    
    if (defaultData.player2.length > 0) {
      console.log(`[browserSafeParser] Extracted ${defaultData.player2.length} build events for player 2`);
    }
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting build order timing:', error);
    return defaultData;
  }
}

/**
 * Extract resource collection metrics (minerals, gas over time)
 */
function extractResourceMetrics(rawData: any): any {
  const defaultData = {
    player1: { 
      collectionRate: { minerals: [], gas: [] },
      unspentResources: { minerals: [], gas: [] }
    },
    player2: { 
      collectionRate: { minerals: [], gas: [] },
      unspentResources: { minerals: [], gas: [] }
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting resource collection metrics');
    
    // Look for resource collection data in frames or player data
    if (rawData._frames && Array.isArray(rawData._frames)) {
      // Sample frames at regular intervals (e.g., every 30 seconds)
      const sampleFrames = sampleFramesAtInterval(rawData._frames, 24 * 30); // 30 seconds intervals
      
      for (const frame of sampleFrames) {
        if (frame.players && Array.isArray(frame.players)) {
          // Extract player 1 data if available
          if (frame.players[0]) {
            const player = frame.players[0];
            if (typeof player.minerals === 'number' && typeof player.gas === 'number') {
              defaultData.player1.unspentResources.minerals.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.minerals
              });
              
              defaultData.player1.unspentResources.gas.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.gas
              });
            }
            
            // Collection rate estimation (difference between frames)
            if (player.mineralsCollected !== undefined) {
              defaultData.player1.collectionRate.minerals.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.mineralsCollected
              });
            }
            
            if (player.gasCollected !== undefined) {
              defaultData.player1.collectionRate.gas.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.gasCollected
              });
            }
          }
          
          // Extract player 2 data if available
          if (frame.players[1]) {
            const player = frame.players[1];
            if (typeof player.minerals === 'number' && typeof player.gas === 'number') {
              defaultData.player2.unspentResources.minerals.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.minerals
              });
              
              defaultData.player2.unspentResources.gas.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.gas
              });
            }
            
            // Collection rate estimation
            if (player.mineralsCollected !== undefined) {
              defaultData.player2.collectionRate.minerals.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.mineralsCollected
              });
            }
            
            if (player.gasCollected !== undefined) {
              defaultData.player2.collectionRate.gas.push({
                time: frame.frame,
                timeFormatted: formatGameTime(frame.frame),
                value: player.gasCollected
              });
            }
          }
        }
      }
    } else if (rawData.economy) {
      // Alternative data structure
      if (rawData.economy.player1) {
        const p1Data = rawData.economy.player1;
        if (p1Data.mineralCollectionRate) {
          defaultData.player1.collectionRate.minerals = p1Data.mineralCollectionRate;
        }
        if (p1Data.gasCollectionRate) {
          defaultData.player1.collectionRate.gas = p1Data.gasCollectionRate;
        }
      }
      
      if (rawData.economy.player2) {
        const p2Data = rawData.economy.player2;
        if (p2Data.mineralCollectionRate) {
          defaultData.player2.collectionRate.minerals = p2Data.mineralCollectionRate;
        }
        if (p2Data.gasCollectionRate) {
          defaultData.player2.collectionRate.gas = p2Data.gasCollectionRate;
        }
      }
    }
    
    // Log what we found
    const p1MineralPoints = defaultData.player1.collectionRate.minerals.length;
    const p1GasPoints = defaultData.player1.collectionRate.gas.length;
    const p2MineralPoints = defaultData.player2.collectionRate.minerals.length;
    const p2GasPoints = defaultData.player2.collectionRate.gas.length;
    
    console.log(`[browserSafeParser] Extracted resource data: P1(${p1MineralPoints} minerals, ${p1GasPoints} gas), P2(${p2MineralPoints} minerals, ${p2GasPoints} gas)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting resource metrics:', error);
    return defaultData;
  }
}

/**
 * Extract supply metrics (blocks, usage over time)
 */
function extractSupplyMetrics(rawData: any): any {
  const defaultData = {
    player1: { 
      supplyUsage: [],
      supplyBlocks: []
    },
    player2: { 
      supplyUsage: [],
      supplyBlocks: []
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting supply metrics');
    
    // Look for supply data in frames
    if (rawData._frames && Array.isArray(rawData._frames)) {
      // Sample frames at regular intervals (e.g., every 30 seconds)
      const sampleFrames = sampleFramesAtInterval(rawData._frames, 24 * 30); // 30 seconds intervals
      
      let lastP1Supply = { used: 0, total: 0 };
      let lastP2Supply = { used: 0, total: 0 };
      let p1Blocked = false;
      let p2Blocked = false;
      let p1BlockStart = 0;
      let p2BlockStart = 0;
      
      for (const frame of sampleFrames) {
        if (frame.players && Array.isArray(frame.players)) {
          // Extract player 1 supply data
          if (frame.players[0]) {
            const player = frame.players[0];
            if (player.supply !== undefined) {
              // Record supply usage
              const supplyUsed = typeof player.supplyUsed === 'number' ? player.supplyUsed : player.supply.used;
              const supplyTotal = typeof player.supplyTotal === 'number' ? player.supplyTotal : player.supply.total;
              
              if (typeof supplyUsed === 'number' && typeof supplyTotal === 'number') {
                defaultData.player1.supplyUsage.push({
                  time: frame.frame,
                  timeFormatted: formatGameTime(frame.frame),
                  used: supplyUsed,
                  total: supplyTotal,
                  percentage: supplyTotal > 0 ? (supplyUsed / supplyTotal * 100) : 0
                });
                
                // Detect supply blocks (when supply used is at or close to max)
                if (supplyUsed >= supplyTotal - 2 && supplyTotal > 10) {
                  if (!p1Blocked) {
                    p1BlockStart = frame.frame;
                    p1Blocked = true;
                  }
                } else if (p1Blocked) {
                  // Supply block ended
                  defaultData.player1.supplyBlocks.push({
                    startTime: p1BlockStart,
                    startTimeFormatted: formatGameTime(p1BlockStart),
                    endTime: frame.frame,
                    endTimeFormatted: formatGameTime(frame.frame),
                    duration: frame.frame - p1BlockStart,
                    durationSeconds: Math.floor((frame.frame - p1BlockStart) / 24)
                  });
                  p1Blocked = false;
                }
                
                lastP1Supply = { used: supplyUsed, total: supplyTotal };
              }
            }
          }
          
          // Extract player 2 supply data
          if (frame.players[1]) {
            const player = frame.players[1];
            if (player.supply !== undefined) {
              // Record supply usage
              const supplyUsed = typeof player.supplyUsed === 'number' ? player.supplyUsed : player.supply.used;
              const supplyTotal = typeof player.supplyTotal === 'number' ? player.supplyTotal : player.supply.total;
              
              if (typeof supplyUsed === 'number' && typeof supplyTotal === 'number') {
                defaultData.player2.supplyUsage.push({
                  time: frame.frame,
                  timeFormatted: formatGameTime(frame.frame),
                  used: supplyUsed,
                  total: supplyTotal,
                  percentage: supplyTotal > 0 ? (supplyUsed / supplyTotal * 100) : 0
                });
                
                // Detect supply blocks (when supply used is at or close to max)
                if (supplyUsed >= supplyTotal - 2 && supplyTotal > 10) {
                  if (!p2Blocked) {
                    p2BlockStart = frame.frame;
                    p2Blocked = true;
                  }
                } else if (p2Blocked) {
                  // Supply block ended
                  defaultData.player2.supplyBlocks.push({
                    startTime: p2BlockStart,
                    startTimeFormatted: formatGameTime(p2BlockStart),
                    endTime: frame.frame,
                    endTimeFormatted: formatGameTime(frame.frame),
                    duration: frame.frame - p2BlockStart,
                    durationSeconds: Math.floor((frame.frame - p2BlockStart) / 24)
                  });
                  p2Blocked = false;
                }
                
                lastP2Supply = { used: supplyUsed, total: supplyTotal };
              }
            }
          }
        }
      }
    }
    
    // Log what we found
    const p1SupplyPoints = defaultData.player1.supplyUsage.length;
    const p1Blocks = defaultData.player1.supplyBlocks.length;
    const p2SupplyPoints = defaultData.player2.supplyUsage.length;
    const p2Blocks = defaultData.player2.supplyBlocks.length;
    
    console.log(`[browserSafeParser] Extracted supply data: P1(${p1SupplyPoints} points, ${p1Blocks} blocks), P2(${p2SupplyPoints} points, ${p2Blocks} blocks)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting supply metrics:', error);
    return defaultData;
  }
}

/**
 * Extract army value and composition over time
 */
function extractArmyValueData(rawData: any): any {
  const defaultData = {
    player1: { 
      armyValueOverTime: [],
      unitComposition: []
    },
    player2: { 
      armyValueOverTime: [],
      unitComposition: []
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting army value data');
    
    // Look for unit data in frames
    if (rawData._frames && Array.isArray(rawData._frames)) {
      // Sample frames at regular intervals (e.g., every 60 seconds)
      const sampleFrames = sampleFramesAtInterval(rawData._frames, 24 * 60); // 60 seconds intervals
      
      for (const frame of sampleFrames) {
        // Process player 1 army data
        if (frame.players && frame.players[0] && frame.players[0].units) {
          const unitCounts = {};
          let totalValue = 0;
          
          // Count units and calculate value
          for (const unit of frame.players[0].units) {
            const unitType = unit.type || unit.name || 'Unknown';
            unitCounts[unitType] = (unitCounts[unitType] || 0) + 1;
            totalValue += getUnitValue(unitType);
          }
          
          // Store army value
          defaultData.player1.armyValueOverTime.push({
            time: frame.frame,
            timeFormatted: formatGameTime(frame.frame),
            value: totalValue
          });
          
          // Store unit composition
          defaultData.player1.unitComposition.push({
            time: frame.frame,
            timeFormatted: formatGameTime(frame.frame),
            composition: unitCounts
          });
        }
        
        // Process player 2 army data
        if (frame.players && frame.players[1] && frame.players[1].units) {
          const unitCounts = {};
          let totalValue = 0;
          
          // Count units and calculate value
          for (const unit of frame.players[1].units) {
            const unitType = unit.type || unit.name || 'Unknown';
            unitCounts[unitType] = (unitCounts[unitType] || 0) + 1;
            totalValue += getUnitValue(unitType);
          }
          
          // Store army value
          defaultData.player2.armyValueOverTime.push({
            time: frame.frame,
            timeFormatted: formatGameTime(frame.frame),
            value: totalValue
          });
          
          // Store unit composition
          defaultData.player2.unitComposition.push({
            time: frame.frame,
            timeFormatted: formatGameTime(frame.frame),
            composition: unitCounts
          });
        }
      }
    } else if (rawData.unitStats) {
      // Alternative data structure
      if (rawData.unitStats.player1) {
        defaultData.player1.armyValueOverTime = rawData.unitStats.player1.armyValue || [];
        defaultData.player1.unitComposition = rawData.unitStats.player1.composition || [];
      }
      
      if (rawData.unitStats.player2) {
        defaultData.player2.armyValueOverTime = rawData.unitStats.player2.armyValue || [];
        defaultData.player2.unitComposition = rawData.unitStats.player2.composition || [];
      }
    }
    
    // Log what we found
    const p1ValuePoints = defaultData.player1.armyValueOverTime.length;
    const p1CompositionPoints = defaultData.player1.unitComposition.length;
    const p2ValuePoints = defaultData.player2.armyValueOverTime.length;
    const p2CompositionPoints = defaultData.player2.unitComposition.length;
    
    console.log(`[browserSafeParser] Extracted army data: P1(${p1ValuePoints} value points, ${p1CompositionPoints} composition points), P2(${p2ValuePoints} value points, ${p2CompositionPoints} composition points)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting army value data:', error);
    return defaultData;
  }
}

/**
 * Extract production efficiency metrics
 */
function extractProductionEfficiency(rawData: any): any {
  const defaultData = {
    player1: { 
      idleProductionTime: [],
      productionFacilities: []
    },
    player2: { 
      idleProductionTime: [],
      productionFacilities: []
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting production efficiency metrics');
    
    // Use the metadata if available
    if (rawData.metadata && rawData.metadata.idleProductionTimePercentage) {
      if (Array.isArray(rawData.metadata.idleProductionTimePercentage)) {
        if (rawData.metadata.idleProductionTimePercentage.length > 0) {
          defaultData.player1.idleProductionTime.push({
            percentage: rawData.metadata.idleProductionTimePercentage[0],
            totalSeconds: rawData.metadata.idleProductionTime ? rawData.metadata.idleProductionTime[0] : 0
          });
        }
        
        if (rawData.metadata.idleProductionTimePercentage.length > 1) {
          defaultData.player2.idleProductionTime.push({
            percentage: rawData.metadata.idleProductionTimePercentage[1],
            totalSeconds: rawData.metadata.idleProductionTime ? rawData.metadata.idleProductionTime[1] : 0
          });
        }
      }
    } else if (rawData._frames && Array.isArray(rawData._frames)) {
      // Attempt to calculate production efficiency from frames
      // Sample frames at regular intervals (e.g., every 120 seconds)
      const sampleFrames = sampleFramesAtInterval(rawData._frames, 24 * 120); // 120 seconds intervals
      
      for (const frame of sampleFrames) {
        // Track production buildings
        if (frame.players && frame.players[0] && frame.players[0].buildings) {
          const buildings = frame.players[0].buildings;
          const productionBuildings = buildings.filter(b => isProductionBuilding(b.type || b.name || ''));
          const idleBuildings = productionBuildings.filter(b => !b.training && !b.producing);
          
          if (productionBuildings.length > 0) {
            defaultData.player1.productionFacilities.push({
              time: frame.frame,
              timeFormatted: formatGameTime(frame.frame),
              total: productionBuildings.length,
              idle: idleBuildings.length,
              idlePercentage: productionBuildings.length > 0 ? 
                (idleBuildings.length / productionBuildings.length * 100) : 0
            });
          }
        }
        
        if (frame.players && frame.players[1] && frame.players[1].buildings) {
          const buildings = frame.players[1].buildings;
          const productionBuildings = buildings.filter(b => isProductionBuilding(b.type || b.name || ''));
          const idleBuildings = productionBuildings.filter(b => !b.training && !b.producing);
          
          if (productionBuildings.length > 0) {
            defaultData.player2.productionFacilities.push({
              time: frame.frame,
              timeFormatted: formatGameTime(frame.frame),
              total: productionBuildings.length,
              idle: idleBuildings.length,
              idlePercentage: productionBuildings.length > 0 ? 
                (idleBuildings.length / productionBuildings.length * 100) : 0
            });
          }
        }
      }
      
      // Calculate average idle percentage for both players
      if (defaultData.player1.productionFacilities.length > 0) {
        const sum = defaultData.player1.productionFacilities.reduce((acc, curr) => acc + curr.idlePercentage, 0);
        const avg = sum / defaultData.player1.productionFacilities.length;
        
        defaultData.player1.idleProductionTime.push({
          percentage: avg,
          totalSeconds: 0 // Cannot determine from frames
        });
      }
      
      if (defaultData.player2.productionFacilities.length > 0) {
        const sum = defaultData.player2.productionFacilities.reduce((acc, curr) => acc + curr.idlePercentage, 0);
        const avg = sum / defaultData.player2.productionFacilities.length;
        
        defaultData.player2.idleProductionTime.push({
          percentage: avg,
          totalSeconds: 0 // Cannot determine from frames
        });
      }
    }
    
    // Log what we found
    const p1IdleData = defaultData.player1.idleProductionTime.length > 0 ? 
      `${defaultData.player1.idleProductionTime[0].percentage.toFixed(2)}%` : 'None';
      
    const p2IdleData = defaultData.player2.idleProductionTime.length > 0 ? 
      `${defaultData.player2.idleProductionTime[0].percentage.toFixed(2)}%` : 'None';
    
    console.log(`[browserSafeParser] Extracted production efficiency: P1(${p1IdleData}), P2(${p2IdleData})`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting production efficiency:', error);
    return defaultData;
  }
}

/**
 * Extract expansion timing data
 */
function extractExpansionTiming(rawData: any): any {
  const defaultData = {
    player1: [],
    player2: []
  };
  
  try {
    console.log('[browserSafeParser] Extracting expansion timing data');
    
    // Look for expansion events in build order or commands
    if (rawData.buildOrderTiming && rawData.buildOrderTiming.player1) {
      // Data is already available in another format
      defaultData.player1 = rawData.buildOrderTiming.player1
        .filter(item => isExpansionBuilding(item.name))
        .map(item => ({
          time: item.time,
          timeFormatted: item.timeFormatted || formatGameTime(item.time),
          name: item.name,
          location: item.location || 'Unknown'
        }));
        
      defaultData.player2 = rawData.buildOrderTiming.player2
        .filter(item => isExpansionBuilding(item.name))
        .map(item => ({
          time: item.time,
          timeFormatted: item.timeFormatted || formatGameTime(item.time),
          name: item.name,
          location: item.location || 'Unknown'
        }));
    } else {
      // Extract from build events or commands
      const p1BuildOrder = extractBuildOrderTiming(rawData).player1;
      const p2BuildOrder = extractBuildOrderTiming(rawData).player2;
      
      // Filter for expansion buildings
      defaultData.player1 = p1BuildOrder
        .filter(item => isExpansionBuilding(item.name))
        .map(item => ({
          time: item.time,
          timeFormatted: item.timeFormatted || formatGameTime(item.time),
          name: item.name,
          location: item.location || 'Unknown'
        }));
        
      defaultData.player2 = p2BuildOrder
        .filter(item => isExpansionBuilding(item.name))
        .map(item => ({
          time: item.time,
          timeFormatted: item.timeFormatted || formatGameTime(item.time),
          name: item.name,
          location: item.location || 'Unknown'
        }));
    }
    
    // Log what we found
    const p1Expansions = defaultData.player1.length;
    const p2Expansions = defaultData.player2.length;
    
    console.log(`[browserSafeParser] Extracted expansion timing: P1(${p1Expansions} expansions), P2(${p2Expansions} expansions)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting expansion timing:', error);
    return defaultData;
  }
}

/**
 * Extract tech path data
 */
function extractTechPath(rawData: any): any {
  const defaultData = {
    player1: [],
    player2: []
  };
  
  try {
    console.log('[browserSafeParser] Extracting tech path data');
    
    // Look for tech building and research events
    const p1BuildOrder = extractBuildOrderTiming(rawData).player1;
    const p2BuildOrder = extractBuildOrderTiming(rawData).player2;
    
    // Filter for tech buildings and research
    defaultData.player1 = p1BuildOrder
      .filter(item => isTechBuilding(item.name) || isResearch(item.name))
      .map(item => ({
        time: item.time,
        timeFormatted: item.timeFormatted || formatGameTime(item.time),
        name: item.name,
        type: isTechBuilding(item.name) ? 'building' : 'research'
      }));
      
    defaultData.player2 = p2BuildOrder
      .filter(item => isTechBuilding(item.name) || isResearch(item.name))
      .map(item => ({
        time: item.time,
        timeFormatted: item.timeFormatted || formatGameTime(item.time),
        name: item.name,
        type: isTechBuilding(item.name) ? 'building' : 'research'
      }));
    
    // Log what we found
    const p1TechItems = defaultData.player1.length;
    const p2TechItems = defaultData.player2.length;
    
    console.log(`[browserSafeParser] Extracted tech path: P1(${p1TechItems} items), P2(${p2TechItems} items)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting tech path:', error);
    return defaultData;
  }
}

/**
 * Extract scouting effectiveness data
 */
function extractScoutingData(rawData: any): any {
  const defaultData = {
    player1: {
      scoutingEvents: [],
      enemyBaseFirstSeenAt: 0,
      enemyTechFirstSeenAt: 0
    },
    player2: {
      scoutingEvents: [],
      enemyBaseFirstSeenAt: 0,
      enemyTechFirstSeenAt: 0
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting scouting data');
    
    // TODO: This requires detailed position data analysis which may not be available
    // For now, we'll set placeholders with some estimated values
    
    if (rawData.metadata && rawData.metadata.gameEvents) {
      // Look for scout unit movements
      const events = rawData.metadata.gameEvents;
      const scoutUnitTypes = ['SCV', 'Probe', 'Drone', 'Overlord', 'Observer'];
      
      // Find scouting-related events
      const scoutingEvents = events.filter(e => 
        (e.type === 'unitPosition' || e.type === 'unitSeen') && 
        scoutUnitTypes.some(u => e.unitType && e.unitType.includes(u))
      );
      
      if (scoutingEvents.length > 0) {
        // Group by player
        const p1Events = scoutingEvents.filter(e => e.player === 0 || e.player === 1);
        const p2Events = scoutingEvents.filter(e => e.player === 1 || e.player === 2);
        
        if (p1Events.length > 0) {
          defaultData.player1.scoutingEvents = p1Events.map(e => ({
            time: e.frame,
            timeFormatted: formatGameTime(e.frame),
            unitType: e.unitType || 'Unknown',
            location: e.location || { x: 0, y: 0 }
          }));
          
          defaultData.player1.enemyBaseFirstSeenAt = p1Events[0].frame;
        }
        
        if (p2Events.length > 0) {
          defaultData.player2.scoutingEvents = p2Events.map(e => ({
            time: e.frame,
            timeFormatted: formatGameTime(e.frame),
            unitType: e.unitType || 'Unknown',
            location: e.location || { x: 0, y: 0 }
          }));
          
          defaultData.player2.enemyBaseFirstSeenAt = p2Events[0].frame;
        }
      }
    } else {
      // Placeholder data based on typical scouting timing
      // For Terran or Protoss: worker scout at around 1:00
      // For Zerg: overlord reaches base at around 2:00
      const player1Race = rawData.metadata?.playerRaces?.[0]?.toLowerCase() || '';
      const player2Race = rawData.metadata?.playerRaces?.[1]?.toLowerCase() || '';
      
      // Set default for player 1
      defaultData.player1.enemyBaseFirstSeenAt = player1Race.includes('zerg') ? 
        24 * 120 : // 2:00
        24 * 60;   // 1:00
        
      // Set default for player 2
      defaultData.player2.enemyBaseFirstSeenAt = player2Race.includes('zerg') ? 
        24 * 120 : // 2:00
        24 * 60;   // 1:00
    }
    
    // Log what we found
    const p1ScoutTime = formatGameTime(defaultData.player1.enemyBaseFirstSeenAt);
    const p2ScoutTime = formatGameTime(defaultData.player2.enemyBaseFirstSeenAt);
    
    console.log(`[browserSafeParser] Estimated scouting times: P1(${p1ScoutTime}), P2(${p2ScoutTime})`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting scouting data:', error);
    return defaultData;
  }
}

/**
 * Extract hotkey usage data
 */
function extractHotkeyData(rawData: any): any {
  const defaultData = {
    player1: {
      hotkeyActions: 0,
      hotkeyDistribution: {},
      hotkeyActionsPerMinute: 0
    },
    player2: {
      hotkeyActions: 0,
      hotkeyDistribution: {},
      hotkeyActionsPerMinute: 0
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting hotkey usage data');
    
    if (rawData.commands && Array.isArray(rawData.commands)) {
      // Filter hotkey commands
      const hotkeyCommands = rawData.commands.filter(cmd => 
        cmd.type === 'setHotkey' || cmd.type === 'selectHotkey' || 
        (cmd.name && (cmd.name.includes('Hotkey') || cmd.name.includes('Control Group')))
      );
      
      if (hotkeyCommands.length > 0) {
        // Group by player
        const p1Commands = hotkeyCommands.filter(cmd => cmd.player === 0 || cmd.player === 1);
        const p2Commands = hotkeyCommands.filter(cmd => cmd.player === 1 || cmd.player === 2);
        
        // Process player 1 hotkeys
        const p1Distribution = {};
        for (const cmd of p1Commands) {
          const hotkey = cmd.hotkey !== undefined ? cmd.hotkey : 
                         cmd.controlGroup !== undefined ? cmd.controlGroup : -1;
          
          if (hotkey >= 0) {
            p1Distribution[hotkey] = (p1Distribution[hotkey] || 0) + 1;
          }
        }
        
        defaultData.player1.hotkeyActions = p1Commands.length;
        defaultData.player1.hotkeyDistribution = p1Distribution;
        
        // Calculate hotkey APM (if game duration available)
        if (rawData.metadata && rawData.metadata.frames) {
          const gameDurationMinutes = rawData.metadata.frames / (24 * 60);
          defaultData.player1.hotkeyActionsPerMinute = gameDurationMinutes > 0 ? 
            Math.round(p1Commands.length / gameDurationMinutes) : 0;
        }
        
        // Process player 2 hotkeys
        const p2Distribution = {};
        for (const cmd of p2Commands) {
          const hotkey = cmd.hotkey !== undefined ? cmd.hotkey : 
                         cmd.controlGroup !== undefined ? cmd.controlGroup : -1;
          
          if (hotkey >= 0) {
            p2Distribution[hotkey] = (p2Distribution[hotkey] || 0) + 1;
          }
        }
        
        defaultData.player2.hotkeyActions = p2Commands.length;
        defaultData.player2.hotkeyDistribution = p2Distribution;
        
        // Calculate hotkey APM (if game duration available)
        if (rawData.metadata && rawData.metadata.frames) {
          const gameDurationMinutes = rawData.metadata.frames / (24 * 60);
          defaultData.player2.hotkeyActionsPerMinute = gameDurationMinutes > 0 ? 
            Math.round(p2Commands.length / gameDurationMinutes) : 0;
        }
      }
    }
    
    // Log what we found
    console.log(`[browserSafeParser] Extracted hotkey data: P1(${defaultData.player1.hotkeyActions} actions, ${defaultData.player1.hotkeyActionsPerMinute} APM), P2(${defaultData.player2.hotkeyActions} actions, ${defaultData.player2.hotkeyActionsPerMinute} APM)`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting hotkey data:', error);
    return defaultData;
  }
}

/**
 * Extract action distribution (macro vs micro)
 */
function extractActionDistribution(rawData: any): any {
  const defaultData = {
    player1: {
      total: 0,
      macro: 0,
      micro: 0,
      other: 0,
      macroPercentage: 0,
      microPercentage: 0,
      otherPercentage: 0
    },
    player2: {
      total: 0,
      macro: 0,
      micro: 0,
      other: 0,
      macroPercentage: 0,
      microPercentage: 0,
      otherPercentage: 0
    }
  };
  
  try {
    console.log('[browserSafeParser] Extracting action distribution');
    
    if (rawData.commands && Array.isArray(rawData.commands)) {
      // Process player 1 actions
      const p1Commands = rawData.commands.filter(cmd => cmd.player === 0 || cmd.player === 1);
      
      let p1Macro = 0;
      let p1Micro = 0;
      let p1Other = 0;
      
      for (const cmd of p1Commands) {
        const type = cmd.type || '';
        const name = cmd.name || '';
        
        // Categorize each command
        if (
          type === 'build' || 
          type === 'train' || 
          type === 'research' || 
          name.includes('Build') || 
          name.includes('Train') || 
          name.includes('Research') || 
          name.includes('Upgrade') || 
          name.includes('worker')
        ) {
          p1Macro++;
        } else if (
          type === 'move' || 
          type === 'attack' || 
          type === 'stop' || 
          type === 'hold' || 
          type === 'patrol' || 
          name.includes('Move') || 
          name.includes('Attack') || 
          name.includes('Ability')
        ) {
          p1Micro++;
        } else {
          p1Other++;
        }
      }
      
      const p1Total = p1Macro + p1Micro + p1Other;
      if (p1Total > 0) {
        defaultData.player1 = {
          total: p1Total,
          macro: p1Macro,
          micro: p1Micro,
          other: p1Other,
          macroPercentage: Math.round((p1Macro / p1Total) * 100),
          microPercentage: Math.round((p1Micro / p1Total) * 100),
          otherPercentage: Math.round((p1Other / p1Total) * 100)
        };
      }
      
      // Process player 2 actions
      const p2Commands = rawData.commands.filter(cmd => cmd.player === 1 || cmd.player === 2);
      
      let p2Macro = 0;
      let p2Micro = 0;
      let p2Other = 0;
      
      for (const cmd of p2Commands) {
        const type = cmd.type || '';
        const name = cmd.name || '';
        
        // Categorize each command
        if (
          type === 'build' || 
          type === 'train' || 
          type === 'research' || 
          name.includes('Build') || 
          name.includes('Train') || 
          name.includes('Research') || 
          name.includes('Upgrade') || 
          name.includes('worker')
        ) {
          p2Macro++;
        } else if (
          type === 'move' || 
          type === 'attack' || 
          type === 'stop' || 
          type === 'hold' || 
          type === 'patrol' || 
          name.includes('Move') || 
          name.includes('Attack') || 
          name.includes('Ability')
        ) {
          p2Micro++;
        } else {
          p2Other++;
        }
      }
      
      const p2Total = p2Macro + p2Micro + p2Other;
      if (p2Total > 0) {
        defaultData.player2 = {
          total: p2Total,
          macro: p2Macro,
          micro: p2Micro,
          other: p2Other,
          macroPercentage: Math.round((p2Macro / p2Total) * 100),
          microPercentage: Math.round((p2Micro / p2Total) * 100),
          otherPercentage: Math.round((p2Other / p2Total) * 100)
        };
      }
    }
    
    // Log what we found
    const p1Ratio = `${defaultData.player1.macroPercentage}% macro, ${defaultData.player1.microPercentage}% micro`;
    const p2Ratio = `${defaultData.player2.macroPercentage}% macro, ${defaultData.player2.microPercentage}% micro`;
    
    console.log(`[browserSafeParser] Extracted action distribution: P1(${p1Ratio}), P2(${p2Ratio})`);
    
    return defaultData;
  } catch (error) {
    console.error('[browserSafeParser] Error extracting action distribution:', error);
    return defaultData;
  }
}

/**
 * Helper function to deeply analyze the replay structure
 */
function deepAnalyzeReplayStructure(obj: any, path: string = '', depth: number = 0): void {
  if (depth > 3) return; // Limit recursion depth
  
  if (obj === null || obj === undefined) {
    console.log(`[browserSafeParser] ${path} is ${obj === null ? 'null' : 'undefined'}`);
    return;
  }
  
  if (typeof obj !== 'object') {
    console.log(`[browserSafeParser] ${path} = ${obj} (${typeof obj})`);
    return;
  }
  
  // Handle array
  if (Array.isArray(obj)) {
    console.log(`[browserSafeParser] ${path || 'root'}: Array with ${obj.length} items`);
    if (obj.length > 0 && depth < 2) {
      console.log(`[browserSafeParser] ${path}[0] sample:`, obj[0]);
      // If it's a complex array, analyze the first item
      if (typeof obj[0] === 'object' && obj[0] !== null) {
        deepAnalyzeReplayStructure(obj[0], `${path}[0]`, depth + 1);
      }
    }
    return;
  }
  
  // Handle objects
  console.log(`[browserSafeParser] ${path || 'root'}: Object with keys: ${Object.keys(obj).join(', ')}`);
  
  // Look for specific keys of interest
  const interestingKeys = ['frames', 'players', 'commands', 'events', 'units', 'buildings', 'header', 'gameEvents', 'metadata', '_frames', '_gameInfo'];
  
  for (const key of interestingKeys) {
    if (key in obj) {
      const value = obj[key];
      const nextPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        console.log(`[browserSafeParser] ${nextPath}: Array with ${value.length} items`);
        if (value.length > 0) {
          console.log(`[browserSafeParser] ${nextPath}[0] sample:`, value[0]);
        }
      } else if (typeof value === 'object' && value !== null) {
        console.log(`[browserSafeParser] ${nextPath}: Object with keys: ${Object.keys(value).join(', ')}`);
        if (depth < 2) {
          deepAnalyzeReplayStructure(value, nextPath, depth + 1);
        }
      } else {
        console.log(`[browserSafeParser] ${nextPath} = ${value} (${typeof value})`);
      }
    }
  }
  
  // Check for specific properties that might contain build order info
  if ('_frames' in obj || '_gameInfo' in obj) {
    console.log('[browserSafeParser] Found internal replay data structures (_frames or _gameInfo)');
    // These are likely the raw parsed data that we need to extract information from
  }
}

/**
 * Sample frames at regular intervals for efficient data extraction
 */
function sampleFramesAtInterval(frames: any[], intervalFrames: number): any[] {
  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return [];
  }
  
  const sampledFrames = [];
  const lastFrameIdx = frames.length - 1;
  
  // Always include the first frame
  sampledFrames.push(frames[0]);
  
  // Sample interior frames at the specified interval
  for (let i = intervalFrames; i < frames[lastFrameIdx].frame; i += intervalFrames) {
    // Find the closest frame to the target time
    const frameIdx = frames.findIndex(f => f.frame >= i);
    if (frameIdx !== -1) {
      sampledFrames.push(frames[frameIdx]);
    }
  }
  
  // Always include the last frame
  if (frames[lastFrameIdx] !== sampledFrames[sampledFrames.length - 1]) {
    sampledFrames.push(frames[lastFrameIdx]);
  }
  
  return sampledFrames;
}

/**
 * Format game time from frames to MM:SS
 */
function formatGameTime(frames: number): string {
  // BW runs at 24 frames per second
  const totalSeconds = Math.floor(frames / 24);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get the value of a unit (for army value calculations)
 */
function getUnitValue(unitType: string): number {
  const lowerType = unitType.toLowerCase();
  
  // Terran units
  if (lowerType.includes('marine')) return 50;
  if (lowerType.includes('firebat')) return 50;
  if (lowerType.includes('ghost')) return 200;
  if (lowerType.includes('vulture')) return 75;
  if (lowerType.includes('goliath')) return 125;
  if (lowerType.includes('siege tank')) return 175;
  if (lowerType.includes('wraith')) return 150;
  if (lowerType.includes('battlecruiser')) return 400;
  
  // Protoss units
  if (lowerType.includes('zealot')) return 100;
  if (lowerType.includes('dragoon')) return 125;
  if (lowerType.includes('high templar')) return 175;
  if (lowerType.includes('archon')) return 350;
  if (lowerType.includes('scout')) return 275;
  if (lowerType.includes('carrier')) return 350;
  
  // Zerg units
  if (lowerType.includes('zergling')) return 25;
  if (lowerType.includes('hydralisk')) return 100;
  if (lowerType.includes('lurker')) return 200;
  if (lowerType.includes('mutalisk')) return 150;
  if (lowerType.includes('ultralisk')) return 300;
  
  // Default for unknown units
  return 50;
}

/**
 * Check if a building is a production building
 */
function isProductionBuilding(buildingType: string): boolean {
  const lowerType = buildingType.toLowerCase();
  
  // Terran production
  if (lowerType.includes('barracks')) return true;
  if (lowerType.includes('factory')) return true;
  if (lowerType.includes('starport')) return true;
  
  // Protoss production
  if (lowerType.includes('gateway')) return true;
  if (lowerType.includes('robotics facility')) return true;
  if (lowerType.includes('stargate')) return true;
  
  // Zerg production
  if (lowerType.includes('hatchery')) return true;
  if (lowerType.includes('lair')) return true;
  if (lowerType.includes('hive')) return true;
  
  return false;
}

/**
 * Check if a building is an expansion building
 */
function isExpansionBuilding(buildingType: string): boolean {
  const lowerType = buildingType.toLowerCase();
  
  if (lowerType.includes('command center')) return true;
  if (lowerType.includes('hatchery')) return true;
  if (lowerType.includes('lair')) return true;
  if (lowerType.includes('hive')) return true;
  if (lowerType.includes('nexus')) return true;
  
  return false;
}

/**
 * Check if a building is a tech building
 */
function isTechBuilding(buildingType: string): boolean {
  const lowerType = buildingType.toLowerCase();
  
  // Terran tech
  if (lowerType.includes('academy')) return true;
  if (lowerType.includes('armory')) return true;
  if (lowerType.includes('science facility')) return true;
  
  // Protoss tech
  if (lowerType.includes('forge')) return true;
  if (lowerType.includes('cybernetics core')) return true;
  if (lowerType.includes('templar archives')) return true;
  if (lowerType.includes('robotics support bay')) return true;
  
  // Zerg tech
  if (lowerType.includes('spawning pool')) return true;
  if (lowerType.includes('hydralisk den')) return true;
  if (lowerType.includes('spire')) return true;
  if (lowerType.includes('greater spire')) return true;
  
  return false;
}

/**
 * Check if an action is research
 */
function isResearch(actionName: string): boolean {
  const lowerName = actionName.toLowerCase();
  
  if (lowerName.includes('upgrade')) return true;
  if (lowerName.includes('research')) return true;
  
  // Specific technologies
  if (lowerName.includes('stimpack')) return true;
  if (lowerName.includes('u-238')) return true;
  if (lowerName.includes('burrowing')) return true;
  if (lowerName.includes('psionic')) return true;
  
  return false;
}

