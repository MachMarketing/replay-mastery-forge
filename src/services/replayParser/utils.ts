
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
