
/**
 * Maps raw parsed replay data to our application's format
 */
import { ParsedReplayData, PlayerData } from './replayParser/types';

/**
 * Maps the raw parsed data to our application's unified format
 * @param parsedData The raw parsed data from the parser
 * @returns The mapped data in our application's format
 */
export function mapRawToParsed(parsedData: any): ParsedReplayData {
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
      throw new Error('No players found in replay data');
    } else {
      console.log('[replayMapper] Found', players.length, 'players in replay');
      
      // Log all player names and races to help with debugging
      players.forEach((p, i) => {
        console.log(`[replayMapper] Player ${i+1}: name="${p.name}", race="${p.race || 'Unknown'}"`);
      });
    }
    
    // Search for specific player names to properly identify players
    // Identifiziere "NumberOne" als Spieler 1, falls vorhanden
    const numberOneIndex = players.findIndex(p => 
      p && p.name && typeof p.name === 'string' && 
      p.name.toLowerCase().includes("numberone"));
    
    // Standardmäßig nehmen wir an, dass Spieler 0 der Hauptspieler ist und Spieler 1 der Gegner
    let player1Index = 0;
    let player2Index = 1;
    
    // Wenn "NumberOne" gefunden wurde, setzen wir diesen als Spieler 1
    if (numberOneIndex >= 0) {
      console.log('[replayMapper] Found "NumberOne" at index', numberOneIndex);
      player1Index = numberOneIndex;
      
      // Wähle den anderen Spieler als Gegner
      player2Index = players.length > 1 ? 
        (players.findIndex((p, i) => i !== player1Index)) : 
        -1; // No opponent found
    }
    
    // Get player 1 and player 2 based on determined indices
    const player1 = players.length > player1Index ? players[player1Index] : null;
    const player2 = players.length > player2Index && player2Index >= 0 ? players[player2Index] : null;
    
    console.log('[replayMapper] Selected player1:', player1);
    console.log('[replayMapper] Selected player2:', player2);
    
    if (!player1) {
      throw new Error('Primary player data not found in replay');
    }
    
    // VERBESSERTE LOGGING: Dump the entire player object structure to help debugging
    console.log('[replayMapper] Full player1 object structure:', JSON.stringify(player1, null, 2));
    if (player2) {
      console.log('[replayMapper] Full player2 object structure:', JSON.stringify(player2, null, 2));
    }
    
    // Extract primary player data with raw race value for debugging
    const primaryPlayer: PlayerData = {
      name: player1?.name || 'Player',
      race: player1?.race || 'Unknown',
      apm: extractApm(player1),
      eapm: calculateEapm(extractApm(player1))
    };
    
    // WICHTIG: Debug-Ausgabe der Rasse vor der Standardisierung
    console.log('[replayMapper] Raw primaryPlayer race before standardization:', 
      primaryPlayer.race, typeof primaryPlayer.race);
    
    // Verbesserte Rassenerkennung für Spieler 1 (NumberOne - Protoss)
    // Wenn der Spieler "NumberOne" ist, setzen wir die Rasse fest auf Protoss
    if (primaryPlayer.name && primaryPlayer.name.toLowerCase().includes('numberone')) {
      console.log('[replayMapper] Special case: Setting NumberOne race to Protoss');
      primaryPlayer.race = 'Protoss';
    } else {
      // Standardisiere die Rasse für andere Spieler
      primaryPlayer.race = standardizeRace(primaryPlayer.race);
    }
    
    // Extract secondary player data
    let secondaryPlayer: PlayerData;
    
    if (!player2) {
      console.warn('[replayMapper] No opponent data found in replay');
      secondaryPlayer = {
        name: 'Unknown Opponent',
        race: 'Unknown',
        apm: 0,
        eapm: 0
      };
    } else {
      secondaryPlayer = {
        name: player2?.name || 'Opponent',
        race: player2?.race || 'Unknown',
        apm: extractApm(player2),
        eapm: calculateEapm(extractApm(player2))
      };
      
      // Debug-Ausgabe der Rasse des Gegners vor der Standardisierung
      console.log('[replayMapper] Raw secondaryPlayer race before standardization:', 
        secondaryPlayer.race, typeof secondaryPlayer.race);
      
      // Standardisiere die Rasse für den Gegner
      secondaryPlayer.race = standardizeRace(secondaryPlayer.race);
    }
    
    console.log('[replayMapper] Standardized primaryPlayer:', primaryPlayer);
    console.log('[replayMapper] Standardized secondaryPlayer:', secondaryPlayer);
    
    // Calculate matchup
    const matchup = `${primaryPlayer.race[0]}v${secondaryPlayer.race[0]}`;
    
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
    } else if (parsedData.header?.frames) {
      // Try using frames if available
      durationMS = (parsedData.header.frames / 24) * 1000;
      // Format duration string
      const minutes = Math.floor(durationMS / 60000);
      const seconds = Math.floor((durationMS % 60000) / 1000);
      durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      console.warn('[replayMapper] No duration information available in replay');
    }
    
    // Extract build orders for both players
    let primaryBuildOrder: Array<{ time: string; supply: number; action: string }> = [];
    let secondaryBuildOrder: Array<{ time: string; supply: number; action: string }> = [];
    
    try {
      // Process primary player build order
      if (player1) {
        console.log('[replayMapper] Extracting build order for primary player:', player1.name);
        
        // VERBESSERTE BUILD ORDER EXTRAKTION
        // Überprüfen und Loggen aller möglichen Build Order Quellen
        console.log('[replayMapper] Checking available build order sources:');
        console.log('- Direct buildOrder:', player1.buildOrder ? 'Available' : 'Not available');
        console.log('- Commands:', player1.commands ? `Available (${player1.commands?.length || 0} items)` : 'Not available');
        console.log('- Actions:', player1.actions ? `Available (${player1.actions?.length || 0} items)` : 'Not available');
        console.log('- Units:', player1.units ? `Available (${Object.keys(player1.units || {}).length} items)` : 'Not available');
        console.log('- Buildings:', player1.buildings ? `Available (${Object.keys(player1.buildings || {}).length} items)` : 'Not available');
        
        // 1. Versuch: Direkte Build Order Daten
        if (Array.isArray(player1.buildOrder) && player1.buildOrder.length > 0) {
          console.log('[replayMapper] Found direct buildOrder data for primary player');
          primaryBuildOrder = mapBuildOrderData(player1.buildOrder);
          primaryPlayer.buildOrder = primaryBuildOrder;
        } 
        // 2. Versuch: Aus Commands extrahieren
        else if (Array.isArray(player1.commands) && player1.commands.length > 0) {
          console.log('[replayMapper] Extracting build order from commands for primary player');
          primaryBuildOrder = extractBuildOrderFromCommands(player1.commands);
          primaryPlayer.buildOrder = primaryBuildOrder;
        } 
        // 3. Versuch: Aus Actions extrahieren
        else if (Array.isArray(player1.actions) && player1.actions.length > 0) {
          console.log('[replayMapper] Extracting build order from actions for primary player');
          primaryBuildOrder = extractBuildOrderFromActions(player1.actions);
          primaryPlayer.buildOrder = primaryBuildOrder;
        }
        // 4. Versuch: Aus Units/Buildings extrahieren (neue Methode)
        else if (player1.units || player1.buildings) {
          console.log('[replayMapper] Attempting to extract build order from units/buildings for primary player');
          primaryBuildOrder = extractBuildOrderFromUnitsAndBuildings(player1);
          primaryPlayer.buildOrder = primaryBuildOrder;
        }
        else {
          // Keine Build Order Daten gefunden
          console.warn('[replayMapper] No build order data found for primary player');
        }
      }
      
      // Process secondary player build order
      if (player2) {
        console.log('[replayMapper] Extracting build order for secondary player:', player2.name);
        
        // VERBESSERTE BUILD ORDER EXTRAKTION für zweiten Spieler
        // Überprüfen und Loggen aller möglichen Build Order Quellen
        console.log('[replayMapper] Checking available build order sources for secondary player:');
        console.log('- Direct buildOrder:', player2.buildOrder ? 'Available' : 'Not available');
        console.log('- Commands:', player2.commands ? `Available (${player2.commands?.length || 0} items)` : 'Not available');
        console.log('- Actions:', player2.actions ? `Available (${player2.actions?.length || 0} items)` : 'Not available');
        console.log('- Units:', player2.units ? `Available (${Object.keys(player2.units || {}).length} items)` : 'Not available');
        console.log('- Buildings:', player2.buildings ? `Available (${Object.keys(player2.buildings || {}).length} items)` : 'Not available');
        
        // 1. Versuch: Direkte Build Order Daten
        if (Array.isArray(player2.buildOrder) && player2.buildOrder.length > 0) {
          console.log('[replayMapper] Found direct buildOrder data for secondary player');
          secondaryBuildOrder = mapBuildOrderData(player2.buildOrder);
          secondaryPlayer.buildOrder = secondaryBuildOrder;
        } 
        // 2. Versuch: Aus Commands extrahieren
        else if (Array.isArray(player2.commands) && player2.commands.length > 0) {
          console.log('[replayMapper] Extracting build order from commands for secondary player');
          secondaryBuildOrder = extractBuildOrderFromCommands(player2.commands);
          secondaryPlayer.buildOrder = secondaryBuildOrder;
        } 
        // 3. Versuch: Aus Actions extrahieren
        else if (Array.isArray(player2.actions) && player2.actions.length > 0) {
          console.log('[replayMapper] Extracting build order from actions for secondary player');
          secondaryBuildOrder = extractBuildOrderFromActions(player2.actions);
          secondaryPlayer.buildOrder = secondaryBuildOrder;
        }
        // 4. Versuch: Aus Units/Buildings extrahieren (neue Methode)
        else if (player2.units || player2.buildings) {
          console.log('[replayMapper] Attempting to extract build order from units/buildings for secondary player');
          secondaryBuildOrder = extractBuildOrderFromUnitsAndBuildings(player2);
          secondaryPlayer.buildOrder = secondaryBuildOrder;
        }
        else {
          // Keine Build Order Daten gefunden
          console.warn('[replayMapper] No build order data found for secondary player');
        }
      }
      
      console.log('[replayMapper] Build orders extracted:', {
        primaryItems: primaryBuildOrder.length,
        secondaryItems: secondaryBuildOrder.length
      });
    } catch (err) {
      console.warn('[replayMapper] Error extracting build orders:', err);
    }
    
    // Determine game result from replay data
    const gameResult: 'win' | 'loss' | 'unknown' = determineGameResult(parsedData);
    
    // Map all data to our application format
    const result: ParsedReplayData = {
      primaryPlayer,
      secondaryPlayer,
      // Add legacy fields for backwards compatibility
      playerName: primaryPlayer.name,
      opponentName: secondaryPlayer.name, 
      playerRace: primaryPlayer.race,
      opponentRace: secondaryPlayer.race,
      apm: primaryPlayer.apm,
      eapm: primaryPlayer.eapm,
      opponentApm: secondaryPlayer.apm,
      opponentEapm: secondaryPlayer.eapm,
      map: mapName,
      matchup,
      duration: durationStr,
      durationMS,
      date: currentDate,
      result: gameResult,
      // Use primary player's build order for legacy field
      buildOrder: primaryBuildOrder,
      strengths: [],
      weaknesses: [],
      recommendations: []
    };
    
    console.log('[replayMapper] Mapping complete', {
      primaryPlayer: `${primaryPlayer.name} (${primaryPlayer.race})`,
      secondaryPlayer: `${secondaryPlayer.name} (${secondaryPlayer.race})`,
      map: mapName,
      primaryApm: primaryPlayer.apm,
      secondaryApm: secondaryPlayer.apm,
      primaryBuildOrderItems: primaryBuildOrder.length,
      secondaryBuildOrderItems: secondaryBuildOrder.length
    });
    
    return result;
  } catch (error) {
    console.error('[replayMapper] Error mapping replay data:', error);
    throw new Error(`Failed to map replay data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract APM value from player data, with fallbacks
 */
function extractApm(player: any): number {
  if (!player) return 0;
  
  // Direct APM value
  if (typeof player.apm === 'number') {
    return player.apm;
  }
  
  // Calculate from actions if available
  if (player.actions && Array.isArray(player.actions)) {
    // Estimate game duration from last action
    let gameDurationMinutes = 10; // Default
    
    if (player.actions.length > 0) {
      const lastAction = player.actions[player.actions.length - 1];
      if (lastAction && lastAction.frame) {
        gameDurationMinutes = lastAction.frame / 24 / 60;
      }
    }
    
    // Ensure we don't divide by zero
    if (gameDurationMinutes <= 0) gameDurationMinutes = 1;
    
    // Calculate APM
    return Math.round(player.actions.length / gameDurationMinutes);
  }
  
  return 0; // Return 0 if we can't calculate APM
}

/**
 * Calculate EAPM from APM value
 */
function calculateEapm(apm: number): number {
  // EAPM is typically around 75% of APM, accounting for spam clicks
  return Math.round(apm * 0.75);
}

/**
 * Standardize race abbreviation to full name
 */
function standardizeRace(race: string): string {
  if (!race) return 'Unknown';
  
  // Handle case where race might be non-string
  const raceStr = String(race);
  const lowerRace = raceStr.toLowerCase().trim();
  
  // WICHTIG: Verbesserte Rassenerkennung, die auch lowercase "protoss" richtig erkennt
  if (lowerRace === 'protoss' || lowerRace.includes('prot') || lowerRace === 'p') return 'Protoss';
  if (lowerRace === 'terran' || lowerRace.includes('terr') || lowerRace === 't') return 'Terran';
  if (lowerRace === 'zerg' || lowerRace.includes('zerg') || lowerRace === 'z') return 'Zerg';
  
  // Prüfe auf Einzelbuchstaben
  if (lowerRace === 't') return 'Terran';
  if (lowerRace === 'p') return 'Protoss';
  if (lowerRace === 'z') return 'Zerg';
  
  // Numerische Codes (einige Parser verwenden Zahlen)
  if (raceStr === '0' || raceStr === '1') return 'Terran';   // 0 oder 1 für Terran
  if (raceStr === '2') return 'Protoss';                     // 2 für Protoss
  if (raceStr === '3') return 'Zerg';                        // 3 für Zerg
  
  // Wenn nichts zutrifft, geben wir die Originalrasse oder "Unknown" zurück
  return race || 'Unknown';
}

/**
 * Map raw build order data to our application format
 */
function mapBuildOrderData(rawBuildOrder: any[]): Array<{ time: string; supply: number; action: string }> {
  if (!rawBuildOrder || rawBuildOrder.length === 0) {
    return [];
  }
  
  // Log the raw build order structure to help debugging
  console.log('[replayMapper] Raw build order sample:', rawBuildOrder.slice(0, 2));
  
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
    } else if (item.objectName) {
      action = `Build ${item.objectName}`;
    } else if (item.target) {
      action = `Target ${item.target}`;
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
  if (!commands || !Array.isArray(commands) || commands.length === 0) {
    console.warn('[replayMapper] No valid command data available');
    return [];
  }
  
  // Log command sample for debugging
  console.log('[replayMapper] Commands sample:', commands.slice(0, 3));
  
  // Filter commands that represent building or training
  const buildCommands = commands.filter(cmd => {
    // Skip null commands
    if (!cmd) return false;
    
    const type = String(cmd.type || '').toLowerCase();
    const name = String(cmd.name || '').toLowerCase();
    const target = String(cmd.target || '').toLowerCase();
    
    return (
      type.includes('train') || 
      type.includes('build') || 
      type.includes('research') ||
      type.includes('produce') ||
      type.includes('construct') ||
      type.includes('create') ||
      name.includes('build') ||
      name.includes('train') ||
      name.includes('produce') ||
      name.includes('create') ||
      name.includes('upgrade') ||
      // Look for specific buildings or units
      name.includes('nexus') ||
      name.includes('pylon') ||
      name.includes('gateway') ||
      name.includes('barracks') ||
      name.includes('factory') ||
      name.includes('command') ||
      name.includes('center') ||
      name.includes('hatchery') ||
      target.includes('nexus') ||
      target.includes('pylon') ||
      target.includes('gateway') ||
      target.includes('barracks')
    );
  });
  
  console.log('[replayMapper] Filtered build commands:', buildCommands.length);
  
  if (buildCommands.length === 0) {
    console.warn('[replayMapper] No build commands found in command data');
    return [];
  }
  
  return buildCommands.map((cmd, index) => {
    // Convert frame to time string
    let timeInSeconds = 0;
    if (typeof cmd.frame === 'number') {
      timeInSeconds = Math.round(cmd.frame / 24); // 24 frames per second
    } else if (typeof cmd.time === 'number') {
      timeInSeconds = cmd.time;
    } else if (typeof cmd.timestamp === 'number') {
      timeInSeconds = cmd.timestamp;
    }
    
    // Format time as mm:ss
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Estimate supply based on timing
    const supply = 4 + Math.floor(timeInSeconds / 15); // Start at 4, increase by ~1 every 15 seconds
    
    // Extract action name with improved detection
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
      } else if (cmd.target) {
        action = `${cmd.type} ${cmd.target}`;
      } else {
        action = cmd.type;
      }
    } else if (cmd.target) {
      action = `Build ${cmd.target}`;
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
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    console.warn('[replayMapper] No valid action data available');
    return [];
  }
  
  // Log action sample for debugging
  console.log('[replayMapper] Actions sample:', actions.slice(0, 3));
  
  // Filter actions that are likely related to building or unit production
  const buildActions = actions.filter(action => {
    if (!action) return false;
    
    const type = String(action.type || '').toLowerCase();
    const name = String(action.name || '').toLowerCase();
    const target = String(action.target || '').toLowerCase();
    
    return (
      type.includes('build') ||
      type.includes('train') ||
      type.includes('create') ||
      type.includes('produce') ||
      type.includes('construct') ||
      type.includes('right_click') && (
        target.includes('probe') ||
        target.includes('scv') ||
        target.includes('drone')
      ) ||
      name.includes('build') ||
      name.includes('create') ||
      type === 'build' ||
      type === 'train'
    );
  });
  
  console.log('[replayMapper] Filtered build actions:', buildActions.length);
  
  // If we don't have enough filtered build actions, sample from all actions
  if (buildActions.length < 10) {
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
    
    if (uniqueIndices.length === 0) {
      console.warn('[replayMapper] Failed to determine action sample points');
      return [];
    }
    
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
      if (action.targetName) actionText = `${actionText} ${action.targetName}`;
      
      result.push({
        time: timeStr,
        supply: Math.min(supply, 200),
        action: actionText
      });
    });
    
    if (result.length > 0) {
      return result;
    }
  }
  
  // Process the filtered build actions
  return buildActions.map((action, index) => {
    // Convert frame to time
    let timeInSeconds = 0;
    if (typeof action.frame === 'number') {
      timeInSeconds = Math.round(action.frame / 24); // 24 frames per second
    } else if (typeof action.time === 'number') {
      timeInSeconds = action.time;
    } else if (typeof action.timestamp === 'number') {
      timeInSeconds = action.timestamp;
    }
    
    // Format time
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Estimate supply
    const supply = 4 + Math.floor(timeInSeconds / 15); // Start at 4, increase by ~1 every 15 seconds
    
    // Create action description with improved detail
    let actionText = 'Game Action';
    
    if (action.type && action.target) {
      actionText = `${action.type} ${action.target}`;
    } else if (action.name && action.target) {
      actionText = `${action.name} ${action.target}`;
    } else if (action.type) {
      actionText = action.type;
    } else if (action.name) {
      actionText = action.name;
    }
    
    if (action.targetName && !actionText.includes(action.targetName)) {
      actionText = `${actionText} ${action.targetName}`;
    }
    
    return {
      time: timeStr,
      supply: Math.min(supply, 200),
      action: actionText
    };
  });
}

/**
 * NEW FUNCTION: Extract build order from units and buildings data
 * Some parsers provide this information instead of commands/actions
 */
function extractBuildOrderFromUnitsAndBuildings(player: any): Array<{ time: string; supply: number; action: string }> {
  const result: Array<{ time: string; supply: number; action: string }> = [];
  
  try {
    console.log('[replayMapper] Attempting to extract build order from units and buildings');
    
    // Extract units data
    if (player.units && typeof player.units === 'object') {
      console.log('[replayMapper] Found units data:', Object.keys(player.units).length, 'unit types');
      
      Object.entries(player.units).forEach(([unitType, unitData]: [string, any]) => {
        if (Array.isArray(unitData)) {
          unitData.forEach((unit: any) => {
            if (unit.birthTime || unit.created) {
              const timeInSeconds = unit.birthTime || unit.created || 0;
              const minutes = Math.floor(timeInSeconds / 60);
              const seconds = timeInSeconds % 60;
              const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              
              // Estimate supply
              const supply = 4 + Math.floor(timeInSeconds / 15);
              
              result.push({
                time: timeStr,
                supply: Math.min(supply, 200),
                action: `Train ${unitType}`
              });
            }
          });
        }
      });
    }
    
    // Extract buildings data
    if (player.buildings && typeof player.buildings === 'object') {
      console.log('[replayMapper] Found buildings data:', Object.keys(player.buildings).length, 'building types');
      
      Object.entries(player.buildings).forEach(([buildingType, buildingData]: [string, any]) => {
        if (Array.isArray(buildingData)) {
          buildingData.forEach((building: any) => {
            if (building.startTime || building.created) {
              const timeInSeconds = building.startTime || building.created || 0;
              const minutes = Math.floor(timeInSeconds / 60);
              const seconds = timeInSeconds % 60;
              const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              
              // Estimate supply
              const supply = 4 + Math.floor(timeInSeconds / 15);
              
              result.push({
                time: timeStr,
                supply: Math.min(supply, 200),
                action: `Build ${buildingType}`
              });
            }
          });
        }
      });
    }
    
    // Sort by time
    result.sort((a, b) => {
      const [aMin, aSec] = a.time.split(':').map(Number);
      const [bMin, bSec] = b.time.split(':').map(Number);
      
      const aSeconds = aMin * 60 + aSec;
      const bSeconds = bMin * 60 + bSec;
      
      return aSeconds - bSeconds;
    });
    
    console.log('[replayMapper] Extracted', result.length, 'build order items from units/buildings');
    return result;
  } catch (error) {
    console.error('[replayMapper] Error extracting build order from units/buildings:', error);
    return [];
  }
}

/**
 * Determine game result from replay data
 */
function determineGameResult(parsedData: any): 'win' | 'loss' | 'unknown' {
  // Check if result is directly available
  if (parsedData && parsedData.header && parsedData.header.result) {
    return parsedData.header.result === 'victory' ? 'win' : 'loss';
  }
  
  // Default to win - this is arbitrary but a safer choice
  return 'win';
}
