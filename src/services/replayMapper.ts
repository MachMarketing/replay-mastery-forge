
/**
 * Maps raw parsed replay data to our application's format
 */
import { ParsedReplayResult } from './replayParserService';

/**
 * Maps the raw parsed replay data to our application's unified format
 * @param parsedData The raw parsed data from the parser
 * @returns The mapped data in our application's format
 */
export function mapRawToParsed(parsedData: any): ParsedReplayResult {
  console.log('[replayMapper] Mapping parsed data to application format', parsedData);
  
  try {
    if (!parsedData) {
      throw new Error('No data provided to mapper');
    }
    
    // Extract game info
    const mapName = parsedData.mapName || parsedData.header?.map || 'Unknown Map';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Ensure we have players data
    const players = Array.isArray(parsedData.players) ? parsedData.players : [];
    
    if (players.length === 0) {
      console.warn('[replayMapper] No players found in parsed data');
    } else {
      console.log('[replayMapper] Found', players.length, 'players in replay');
    }
    
    // Get player 1 (index 0)
    const player1 = players.length > 0 ? players[0] : null;
    // Get player 2 (index 1) - the opponent
    const player2 = players.length > 1 ? players[1] : null;
    
    // Extract player names
    const playerName = player1?.name || 'Player';
    const opponentName = player2?.name || 'Opponent';
    
    // Extract races, standardized to full name
    const playerRace = standardizeRace(player1?.race || 'Unknown');
    const opponentRace = standardizeRace(player2?.race || 'Unknown');
    
    // Calculate matchup
    const matchup = `${playerRace[0]}v${opponentRace[0]}`;
    
    // Get duration (in milliseconds and formatted string)
    let durationMS = 0;
    let durationStr = '0:00';
    
    if (parsedData.header?.durationFrames) {
      // Convert frames to milliseconds (24 frames per second)
      durationMS = (parsedData.header.durationFrames / 24) * 1000;
      
      // Format duration string
      const minutes = Math.floor(durationMS / 60000);
      const seconds = Math.floor((durationMS % 60000) / 1000);
      durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (parsedData.header?.duration) {
      // Some parsers provide duration directly
      durationMS = parsedData.header.duration;
      // Format duration string
      const minutes = Math.floor(durationMS / 60000);
      const seconds = Math.floor((durationMS % 60000) / 1000);
      durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      console.warn('[replayMapper] No duration information available in replay');
      // Default to 10 minutes
      durationMS = 600000;
      durationStr = '10:00';
    }
    
    // Extract APM values for both players
    let playerApm = 0;
    let playerEapm = 0;
    let opponentApm = 0;
    let opponentEapm = 0;
    
    // Get APM for player 1
    if (player1) {
      // Try to get APM directly from the player object
      if (typeof player1.apm === 'number') {
        playerApm = player1.apm;
      } 
      // Try to calculate from actions
      else if (player1.actions && Array.isArray(player1.actions)) {
        const minutes = durationMS / 60000;
        playerApm = Math.round(player1.actions.length / (minutes || 1));
      } 
      // Fallback
      else {
        playerApm = 150; // Default fallback
      }
      
      // Calculate EAPM (effective APM) - typically ~75% of APM accounting for spam clicks
      playerEapm = Math.round(playerApm * 0.75);
    }
    
    // Get APM for player 2 (opponent)
    if (player2) {
      // Try to get APM directly from the player object
      if (typeof player2.apm === 'number') {
        opponentApm = player2.apm;
      } 
      // Try to calculate from actions
      else if (player2.actions && Array.isArray(player2.actions)) {
        const minutes = durationMS / 60000;
        opponentApm = Math.round(player2.actions.length / (minutes || 1));
      } 
      // Fallback
      else {
        // Only use randomized fallback if we really have no data
        opponentApm = 150; // Default fallback
      }
      
      // Calculate EAPM (effective APM) - typically ~75% of APM accounting for spam clicks
      opponentEapm = Math.round(opponentApm * 0.75);
    }
    
    console.log('[replayMapper] Player APM/EAPM:', playerApm, playerEapm);
    console.log('[replayMapper] Opponent APM/EAPM:', opponentApm, opponentEapm);
    
    // Parse build order for player 1
    let buildOrder: Array<{ time: string; supply: number; action: string }> = [];
    
    // Try to extract build order from various possible sources
    if (player1) {
      if (Array.isArray(player1.buildOrder)) {
        // Direct build order data
        buildOrder = mapBuildOrderData(player1.buildOrder);
      } else if (Array.isArray(player1.commands)) {
        // Extract from commands
        buildOrder = extractBuildOrderFromCommands(player1.commands);
      } else if (Array.isArray(player1.actions)) {
        // Extract from actions as last resort
        buildOrder = extractBuildOrderFromActions(player1.actions);
      }
    }
    
    console.log('[replayMapper] Extracted build order items:', buildOrder.length);
    
    // Determine game result - for now simple 50/50 chance
    // In a real implementation, this would be extracted from the replay data
    const gameResult: 'win' | 'loss' = determineGameResult(parsedData);
    
    // Generate strengths, weaknesses, and recommendations based on race and build order
    const analysis = generateAnalysis(playerRace, opponentRace, buildOrder, mapName);
    
    // Map all data to our application format
    const result: ParsedReplayResult = {
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      map: mapName,
      matchup,
      duration: durationStr,
      durationMS,
      date: currentDate,
      result: gameResult,
      apm: playerApm,
      eapm: playerEapm,
      opponentApm: opponentApm, // Add opponent APM
      opponentEapm: opponentEapm, // Add opponent EAPM
      buildOrder,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations
    };
    
    console.log('[replayMapper] Mapping complete', {
      player: `${playerName} (${playerRace})`,
      opponent: `${opponentName} (${opponentRace})`,
      map: mapName,
      apm: playerApm,
      opponentApm
    });
    
    return result;
  } catch (error) {
    console.error('[replayMapper] Error mapping replay data:', error);
    
    // Return a minimal valid result on error
    return {
      playerName: 'Error',
      opponentName: 'Error',
      playerRace: 'Terran',
      opponentRace: 'Terran',
      map: 'Parsing Error',
      matchup: 'TvT',
      duration: '0:00',
      durationMS: 0,
      date: new Date().toISOString().split('T')[0],
      result: 'loss',
      apm: 0,
      eapm: 0,
      opponentApm: 0,
      opponentEapm: 0,
      buildOrder: [],
      strengths: ['Could not parse replay data'],
      weaknesses: ['Replay file may be corrupted'],
      recommendations: ['Try uploading a different replay file']
    };
  }
}

/**
 * Standardize race abbreviation to full name
 */
function standardizeRace(race: string): string {
  if (!race) return 'Unknown';
  
  const lowerRace = race.toLowerCase();
  
  if (lowerRace.includes('t') || lowerRace.includes('terr')) return 'Terran';
  if (lowerRace.includes('p') || lowerRace.includes('prot')) return 'Protoss';
  if (lowerRace.includes('z') || lowerRace.includes('zerg')) return 'Zerg';
  
  return race;
}

/**
 * Map raw build order data to our application format
 */
function mapBuildOrderData(rawBuildOrder: any[]): Array<{ time: string; supply: number; action: string }> {
  return rawBuildOrder.map((item: any, index) => {
    // Extract time in frames or seconds
    let timeInSeconds = 0;
    if (typeof item.frame === 'number') {
      timeInSeconds = Math.round(item.frame / 24); // 24 frames per second
    } else if (typeof item.time === 'number') {
      timeInSeconds = item.time;
    }
    
    // Format time as mm:ss
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Extract or estimate supply
    let supply = item.supply || 0;
    if (!supply) {
      // Estimate supply based on timing
      supply = 4 + Math.floor(timeInSeconds / 15); // Start at 4, increase by ~1 every 15 seconds
      supply = Math.min(supply, 200); // Cap at max supply of 200
    }
    
    // Extract action
    let action = 'Unknown Action';
    if (item.action) {
      action = item.action;
    } else if (item.name) {
      action = item.name;
    } else if (item.type) {
      action = item.type;
    }
    
    return {
      time: timeStr,
      supply,
      action
    };
  });
}

/**
 * Extract build order from command data
 */
function extractBuildOrderFromCommands(commands: any[]): Array<{ time: string; supply: number; action: string }> {
  if (!commands || !Array.isArray(commands)) return [];
  
  // Filter commands that represent building or training
  const buildCommands = commands.filter(cmd => {
    const type = (cmd.type || '').toLowerCase();
    const name = (cmd.name || '').toLowerCase();
    
    return (
      type.includes('train') || 
      type.includes('build') || 
      type.includes('research') ||
      name.includes('build') ||
      name.includes('train')
    );
  });
  
  return buildCommands.map((cmd, index) => {
    // Convert frame to time string
    let timeInSeconds = 0;
    if (typeof cmd.frame === 'number') {
      timeInSeconds = Math.round(cmd.frame / 24); // 24 frames per second
    } else if (typeof cmd.time === 'number') {
      timeInSeconds = cmd.time;
    }
    
    // Format time as mm:ss
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Estimate supply based on timing
    const supply = 4 + Math.floor(timeInSeconds / 15); // Start at 4, increase by ~1 every 15 seconds
    
    // Extract action name
    let action = 'Unknown Action';
    if (cmd.action) {
      action = cmd.action;
    } else if (cmd.name) {
      action = cmd.name;
    } else if (cmd.type) {
      if (cmd.type.toLowerCase().includes('train') && cmd.unit) {
        action = `Train ${cmd.unit}`;
      } else if (cmd.type.toLowerCase().includes('build') && cmd.building) {
        action = `Build ${cmd.building}`;
      } else {
        action = cmd.type;
      }
    }
    
    return {
      time: timeStr,
      supply: Math.min(supply, 200),
      action
    };
  });
}

/**
 * Extract build order from player actions (less accurate)
 */
function extractBuildOrderFromActions(actions: any[]): Array<{ time: string; supply: number; action: string }> {
  if (!actions || !Array.isArray(actions) || actions.length === 0) return [];
  
  // Get every Nth action, more frequent in early game, less later
  const result: Array<{ time: string; supply: number; action: string }> = [];
  const totalActions = actions.length;
  
  // Take samples at key points
  const sampleIndices = [
    // Early game - more samples
    5, 15, 25, 40, 
    // Mid game - fewer samples
    Math.floor(totalActions * 0.2),
    Math.floor(totalActions * 0.3),
    Math.floor(totalActions * 0.4),
    // Late game - sparse samples
    Math.floor(totalActions * 0.6),
    Math.floor(totalActions * 0.8)
  ];
  
  // Get unique indices
  const uniqueIndices = [...new Set(sampleIndices)].filter(i => i < totalActions);
  
  // Extract actions at these indices
  uniqueIndices.forEach(index => {
    const action = actions[index];
    if (!action) return;
    
    // Convert frame to time
    let timeInSeconds = 0;
    if (typeof action.frame === 'number') {
      timeInSeconds = Math.round(action.frame / 24); // 24 frames per second
    } else if (typeof action.time === 'number') {
      timeInSeconds = action.time;
    }
    
    // Format time
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Estimate supply
    const supply = 4 + Math.floor(timeInSeconds / 15); // Start at 4, increase by ~1 every 15 seconds
    
    // Create action description based on type or available info
    let actionText = 'Game Action';
    if (action.type) actionText = action.type;
    if (action.name) actionText = action.name;
    
    result.push({
      time: timeStr,
      supply: Math.min(supply, 200),
      action: actionText
    });
  });
  
  return result;
}

/**
 * Simple game result determination
 */
function determineGameResult(parsedData: any): 'win' | 'loss' {
  // Check if result is directly available
  if (parsedData && parsedData.header && parsedData.header.result) {
    return parsedData.header.result === 'victory' ? 'win' : 'loss';
  }
  
  // For test purposes, use semi-random but consistent result based on map name
  if (parsedData && parsedData.mapName) {
    // Simple hash of map name
    const hash = parsedData.mapName
      .split('')
      .reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
    
    return hash % 2 === 0 ? 'win' : 'loss';
  }
  
  // Default to win, because players like winning :)
  return 'win';
}

/**
 * Generate analysis based on race and build order
 */
function generateAnalysis(
  playerRace: string,
  opponentRace: string,
  buildOrder: Array<{ time: string; supply: number; action: string }>,
  mapName: string
) {
  // Base results
  const results = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    recommendations: [] as string[]
  };
  
  // Race-based analysis
  switch (playerRace) {
    case 'Terran':
      results.strengths.push('Gute Positionierung der Terran-Einheiten');
      results.weaknesses.push('Könnte früher expandieren');
      results.recommendations.push('Mehr Dropship-Harassment verwenden');
      break;
      
    case 'Protoss':
      results.strengths.push('Effektiver Einsatz von Protoss-Zaubersprüchen');
      results.weaknesses.push('Zu wenig Observer für Map-Kontrolle');
      results.recommendations.push('Mehr auf Expansion und Technologie achten');
      break;
      
    case 'Zerg':
      results.strengths.push('Gute Creep-Ausbreitung für Zerg-Mobilität');
      results.weaknesses.push('Zu spätes Upgraden von Metabolic Boost');
      results.recommendations.push('Früher auf Lurker umsteigen gegen diesen Gegner');
      break;
  }
  
  // Matchup-based analysis (e.g., PvT, ZvP, etc.)
  const matchup = `${playerRace[0]}v${opponentRace[0]}`;
  
  switch (matchup) {
    case 'TvP':
      results.strengths.push('Effektive Belagerungspanzer-Positionierung gegen Protoss');
      results.recommendations.push('Mehr Medics in deine Bio-Armee integrieren');
      break;
      
    case 'TvZ':
      results.strengths.push('Guter Mineneinsatz gegen Zerglings');
      results.recommendations.push('Mehr auf Science Vessels für Detection setzen');
      break;
      
    case 'PvT':
      results.strengths.push('Guter Einsatz von High Templars gegen Bio-Bälle');
      results.recommendations.push('Mehr Observer für die Aufklärung produzieren');
      break;
      
    case 'PvZ':
      results.strengths.push('Effektive Cannon-Absicherung gegen Zerg-Rushes');
      results.recommendations.push('Früher auf Corsairs umsteigen gegen Muta-Schwärme');
      break;
      
    case 'ZvT':
      results.strengths.push('Guter Einsatz von Lurkers gegen Marines');
      results.recommendations.push('Mehr Sunken Colonies zum Verteidigen bauen');
      break;
      
    case 'ZvP':
      results.strengths.push('Effektiver Einsatz von Zerglings gegen frühe Zealots');
      results.recommendations.push('Mehr Overlords für Map-Kontrolle produzieren');
      break;
  }
  
  // Map-based analysis
  if (mapName.toLowerCase().includes('python')) {
    results.recommendations.push('Auf dieser Karte durch die Mitte expandieren');
  } else if (mapName.toLowerCase().includes('polypoid')) {
    results.recommendations.push('Auf Polypoid mehr auf Expansion und Lufteinheiten achten');
  } else if (mapName.toLowerCase().includes('luna')) {
    results.recommendations.push('Auf Luna mehr auf Lufteinheiten setzen');
  }
  
  // Build order analysis
  if (buildOrder.length > 0) {
    const earlyBuild = buildOrder.filter(item => {
      const [min, sec] = item.time.split(':').map(Number);
      return (min * 60 + sec) < 300; // first 5 minutes
    });
    
    if (earlyBuild.length < 5) {
      results.weaknesses.push('Build-Order in der frühen Phase zu ungenau');
    } else {
      results.strengths.push('Effiziente frühe Build-Order');
    }
  } else {
    results.weaknesses.push('Keine Build-Order-Daten verfügbar zur Analyse');
  }
  
  // Ensure we have some analysis even if the data is sparse
  if (results.strengths.length < 2) {
    results.strengths.push('Solides mechanisches Spiel');
    results.strengths.push('Gute Ressourcennutzung');
  }
  
  if (results.weaknesses.length < 2) {
    results.weaknesses.push('Könnte mehr scouten');
    results.weaknesses.push('Build-Order könnte optimiert werden');
  }
  
  if (results.recommendations.length < 2) {
    results.recommendations.push('Standard-Build-Order gegen dieses Match-Up üben');
    results.recommendations.push('Timing-Angriffe perfektionieren');
  }
  
  return results;
}
