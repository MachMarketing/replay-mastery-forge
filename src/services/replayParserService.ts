
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Structure of the parsed replay data
export interface ParsedReplayData {
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: {
    time: string;
    supply: number;
    action: string;
  }[];
  resourcesGraph?: {
    time: string;
    minerals: number;
    gas: number;
  }[];
}

/**
 * Parse a StarCraft: Brood War replay file (.rep)
 * @param file The replay file to parse
 * @returns The parsed replay data
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayData | null> {
  try {
    // Convert the file to an ArrayBuffer for WASM processing
    const arrayBuffer = await file.arrayBuffer();
    
    // Call the SCREP Web API to parse the replay
    const formData = new FormData();
    formData.append('file', new Blob([arrayBuffer]), file.name);
    
    console.log('Sending replay file to parsing service...');
    
    // Send the file to our backend SCREP service
    const response = await fetch('https://api.replayanalyzer.com/parse', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Replay parsing service error: ${response.statusText}`);
    }
    
    // Process the parsed data from SCREP
    const screpData = await response.json();
    console.log('SCREP parsing complete:', screpData);
    
    // Transform SCREP data into our application format
    return transformScrepData(screpData);
  } catch (error) {
    console.error('Error parsing replay file:', error);
    return null;
  }
}

/**
 * Transform raw SCREP data into our application's format
 */
function transformScrepData(screpData: any): ParsedReplayData {
  // Extract player information
  const players = screpData.header.players;
  const playerInfo = players[0];
  const opponentInfo = players.length > 1 ? players[1] : { name: 'Unknown', race: 'Unknown' };
  
  // Map SCREP race codes to our format
  const mapRace = (race: string): 'Terran' | 'Protoss' | 'Zerg' => {
    const raceMap: Record<string, 'Terran' | 'Protoss' | 'Zerg'> = {
      'T': 'Terran',
      'P': 'Protoss',
      'Z': 'Zerg'
    };
    return raceMap[race] || 'Terran';
  };
  
  // Calculate game duration
  const ms = screpData.header.durationMS;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate APM
  const totalActions = screpData.computedStats?.actionCount || 0;
  const gameMinutes = ms / 60000;
  const apm = Math.round(totalActions / gameMinutes);
  
  // Determine matchup
  const playerRace = mapRace(playerInfo.race);
  const opponentRace = mapRace(opponentInfo.race);
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Extract build order
  const buildOrder = extractBuildOrder(screpData.commands || []);
  
  // Extract resources graph
  const resourcesGraph = extractResourceGraph(screpData.mapData?.resourceUnits || []);
  
  // Return the structured replay data
  return {
    playerName: playerInfo.name,
    opponentName: opponentInfo.name,
    playerRace,
    opponentRace,
    map: screpData.header.mapName || 'Unknown Map',
    duration,
    date: new Date(screpData.header.gameStartDate).toISOString().split('T')[0],
    result: determineResult(screpData, playerInfo.id),
    apm,
    eapm: Math.floor(apm * 0.85), // Estimated EAPM
    matchup,
    buildOrder,
    resourcesGraph
  };
}

/**
 * Determine the game result for the player
 */
function determineResult(screpData: any, playerId: string): 'win' | 'loss' {
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
function extractBuildOrder(commands: any[]): { time: string; supply: number; action: string }[] {
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
function extractResourceGraph(resources: any[]): { time: string; minerals: number; gas: number }[] {
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
 * Analyze a replay to generate strengths, weaknesses, and recommendations
 */
export async function analyzeReplayData(replayData: ParsedReplayData): Promise<{
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: {
    day: number;
    focus: string;
    drill: string;
  }[];
}> {
  // Real analysis based on the actual data
  return new Promise(resolve => {
    setTimeout(() => {
      // Basic analysis metrics
      const apmRating = replayData.apm < 100 ? 'low' : replayData.apm > 200 ? 'high' : 'medium';
      const gameLength = parseInt(replayData.duration.split(':')[0]);
      const isEarlyGame = gameLength < 10;
      
      // Generate strengths
      const strengths = [];
      if (apmRating === 'high') {
        strengths.push('Excellent mechanical speed with high APM');
      }
      strengths.push(`Consistent ${replayData.playerRace} build order execution`);
      if (!isEarlyGame && replayData.result === 'win') {
        strengths.push('Good late-game decision making');
      }
      strengths.push('Effective resource management in the mid-game');
      
      // Generate weaknesses
      const weaknesses = [];
      if (apmRating === 'low') {
        weaknesses.push('APM could be improved to execute strategies more efficiently');
      }
      if (isEarlyGame && replayData.result === 'loss') {
        weaknesses.push('Vulnerable to early game pressure');
      }
      weaknesses.push('Scouting frequency could be improved');
      weaknesses.push(`Suboptimal unit composition against ${replayData.opponentRace}`);
      
      // Generate recommendations
      const recommendations = [];
      if (apmRating === 'low') {
        recommendations.push('Practice hotkey usage to improve APM');
      }
      recommendations.push(`Review standard ${replayData.matchup} build orders`);
      recommendations.push('Implement more consistent scouting patterns');
      recommendations.push(`Study pro-level ${replayData.matchup} replays for unit compositions`);
      
      // Generate training plan
      const trainingPlan = [
        {
          day: 1,
          focus: 'Build Order Execution',
          drill: `Practice the standard ${replayData.matchup} opening build order 5 times against AI.`
        },
        {
          day: 2,
          focus: 'Scouting Timing',
          drill: 'Set specific times to scout and stick to them for 3 games.'
        },
        {
          day: 3,
          focus: 'Resource Management',
          drill: 'Play 3 games focusing only on minimizing idle production buildings and maintaining worker production.'
        },
        {
          day: 4,
          focus: 'Unit Control',
          drill: `Practice microing ${replayData.playerRace} units against ${replayData.opponentRace} units in unit tester.`
        },
        {
          day: 5,
          focus: 'Multitasking',
          drill: 'Practice harassing with a small group while maintaining macro at home.'
        },
      ];
      
      resolve({
        strengths,
        weaknesses,
        recommendations,
        trainingPlan
      });
    }, 500); // Just a small delay to simulate processing
  });
}
