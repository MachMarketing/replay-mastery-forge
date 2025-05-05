
/**
 * Determine the game result for the player
 */
export function determineResult(screpData: any, playerId: string): 'win' | 'loss' {
  // Extract winner information from SCREP data
  const winner = screpData.header.winner;
  
  // If there's explicit winner information
  if (winner !== undefined) {
    return winner === playerId ? 'win' : 'loss';
  }
  
  // If there's no explicit winner, check if any player left
  const leftGame = screpData.commands.find((cmd: any) => 
    cmd.type === 'LeaveGame' && cmd.player.id !== playerId
  );
  
  return leftGame ? 'win' : 'loss';
}

/**
 * Extract build order from commands
 */
export function extractBuildOrder(commands: any[]): { time: string; supply: number; action: string }[] {
  const buildOrderCommands = commands.filter((cmd: any) => 
    cmd.type === 'BuildOrder' || 
    cmd.type === 'TrainUnit' || 
    cmd.type === 'Research'
  );
  
  return buildOrderCommands.slice(0, 20).map((cmd: any) => {
    const timeMs = cmd.time;
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      supply: cmd.supply || 0,
      action: cmd.action || cmd.unitType || 'Unknown Action'
    };
  });
}

/**
 * Extract resource graph data
 */
export function extractResourceGraph(resources: any[]): { time: string; minerals: number; gas: number }[] {
  // Get sample points every 2 minutes of game time
  const result = [];
  const snapshots = resources.filter((r: any) => r.type === 'ResourceSnapshot');
  
  for (let i = 0; i < snapshots.length; i += 5) {
    const snapshot = snapshots[i];
    const timeMs = snapshot.time;
    const minutes = Math.floor(timeMs / 60000);
    
    result.push({
      time: `${minutes}:00`,
      minerals: snapshot.minerals,
      gas: snapshot.gas
    });
  }
  
  return result;
}

/**
 * Map SCREP race codes to our format
 */
export function mapRace(race: string): 'Terran' | 'Protoss' | 'Zerg' {
  const raceMap: Record<string, 'Terran' | 'Protoss' | 'Zerg'> = {
    'T': 'Terran',
    'P': 'Protoss',
    'Z': 'Zerg'
  };
  return raceMap[race] || 'Terran';
}

/**
 * Extract basic header information from a replay file
 */
export function extractReplayHeaderInfo(fileData: Uint8Array): { 
  mapName: string; 
  frameCount: number; 
  gameType: string;
} {
  // Simple extraction of map name from the binary data
  // Note: This is a very basic implementation
  let mapName = 'Unknown Map';
  let frameCount = 0;
  let gameType = 'Unknown';
  
  try {
    // Try to find map name in the header (often after a specific byte pattern)
    // This is a simplified approach and might not work for all replay formats
    const headerBytes = fileData.slice(0, 2000);
    const headerText = new TextDecoder().decode(headerBytes);
    
    // Extract map name (simplified approach)
    const mapMatch = headerText.match(/\((\w+)\)/);
    if (mapMatch && mapMatch[1]) {
      mapName = mapMatch[1];
    }
    
    // Estimate frame count from file size
    // This is just a rough estimate, not accurate
    frameCount = Math.floor(fileData.length / 100);
    
    // Try to determine game type
    if (headerText.includes('melee')) {
      gameType = 'Melee';
    } else if (headerText.includes('UMS')) {
      gameType = 'UMS';
    }
  } catch (e) {
    console.error('Error extracting header info:', e);
  }
  
  return {
    mapName,
    frameCount,
    gameType
  };
}

/**
 * Extract player information from a replay file
 */
export function extractPlayerInfo(fileData: Uint8Array): {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
} {
  // Default values
  let playerName = 'Player';
  let opponentName = 'Opponent';
  let playerRace = 'T';
  let opponentRace = 'Z';
  
  try {
    // In a real implementation, we would parse the replay file
    // to extract player information. This is a simplified approach.
    const headerBytes = fileData.slice(0, 5000);
    const headerText = new TextDecoder().decode(headerBytes);
    
    // Try to find player names (very simplified approach)
    const nameMatches = headerText.match(/name\s*=\s*"([^"]+)"/g);
    if (nameMatches && nameMatches.length >= 2) {
      playerName = nameMatches[0].replace(/name\s*=\s*"/, '').replace(/"$/, '');
      opponentName = nameMatches[1].replace(/name\s*=\s*"/, '').replace(/"$/, '');
    }
    
    // Try to find race information (very simplified approach)
    if (headerText.includes('Terran') && headerText.includes('Zerg')) {
      playerRace = 'T';
      opponentRace = 'Z';
    } else if (headerText.includes('Protoss') && headerText.includes('Terran')) {
      playerRace = 'P';
      opponentRace = 'T';
    } else if (headerText.includes('Zerg') && headerText.includes('Protoss')) {
      playerRace = 'Z';
      opponentRace = 'P';
    }
  } catch (e) {
    console.error('Error extracting player info:', e);
  }
  
  return {
    playerName,
    opponentName,
    playerRace,
    opponentRace
  };
}
