
// Mock implementation of replay parser functionality
// This replaces the dependency on screp-js with our own implementation

export interface ParsedReplayResult {
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
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
}

export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file with internal parser:', file.name);
  
  try {
    // Instead of using screp-js, we'll extract information from the file name
    // and generate a realistic mock response
    console.log('Generating mock replay data for demonstration purposes');
    
    // Extract information from filename if possible
    const filenameParts = file.name.split('_');
    const hasInfoInFilename = filenameParts.length > 2;
    
    // Generate mock player data
    const playerRace = selectRandomRace();
    const opponentRace = selectRandomRace();
    
    // Create parsed data
    const parsedData: ParsedReplayResult = {
      playerName: hasInfoInFilename ? filenameParts[0] : 'Player',
      opponentName: hasInfoInFilename ? filenameParts[1] : 'Opponent',
      playerRace,
      opponentRace,
      map: generateRandomMap(),
      duration: generateRandomDuration(),
      date: new Date().toISOString().split('T')[0], // Today's date
      result: Math.random() > 0.5 ? 'win' : 'loss', // Random result
      apm: Math.floor(Math.random() * 200) + 80, // Random APM between 80-280
      matchup: `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`,
      buildOrder: generateBuildOrder(playerRace),
      resourcesGraph: generateResourceGraph()
    };
    
    console.log('Generated mock replay data:', parsedData);
    return parsedData;
    
  } catch (error) {
    console.error('Error during replay parsing:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}

// Helper function to select a random race
function selectRandomRace(): 'Terran' | 'Protoss' | 'Zerg' {
  const races = ['Terran', 'Protoss', 'Zerg'];
  return races[Math.floor(Math.random() * races.length)] as 'Terran' | 'Protoss' | 'Zerg';
}

// Helper function to generate a random map name
function generateRandomMap(): string {
  const maps = [
    'Fighting Spirit', 'Circuit Breaker', 'Jade', 'Neo Sylphid', 
    'Polypoid', 'Eclipse', 'Heartbreak Ridge', 'Aztec'
  ];
  return maps[Math.floor(Math.random() * maps.length)];
}

// Helper function to generate a random game duration
function generateRandomDuration(): string {
  const minutes = Math.floor(Math.random() * 30) + 10; // Between 10-40 minutes
  const seconds = Math.floor(Math.random() * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to generate a realistic build order based on race
function generateBuildOrder(race: string): { time: string; supply: number; action: string }[] {
  const buildOrder = [];
  let currentSupply = 4;
  
  const terranBuildOrder = [
    'SCV', 'SCV', 'Supply Depot', 'SCV', 'Barracks', 'Refinery', 
    'SCV', 'Marine', 'SCV', 'Supply Depot', 'Marine', 'Factory', 
    'Marine', 'SCV', 'Machine Shop', 'Tank', 'Supply Depot'
  ];
  
  const protossBuildOrder = [
    'Probe', 'Probe', 'Pylon', 'Probe', 'Gateway', 'Assimilator', 
    'Probe', 'Zealot', 'Cybernetics Core', 'Probe', 'Dragoon', 
    'Pylon', 'Probe', 'Robotics Facility', 'Observer'
  ];
  
  const zergBuildOrder = [
    'Drone', 'Drone', 'Overlord', 'Drone', 'Drone', 'Spawning Pool', 
    'Drone', 'Extractor', 'Zergling', 'Zergling', 'Drone', 
    'Hydralisk Den', 'Overlord', 'Hydralisk', 'Hydralisk'
  ];
  
  let buildItems;
  if (race === 'Terran') buildItems = terranBuildOrder;
  else if (race === 'Protoss') buildItems = protossBuildOrder;
  else buildItems = zergBuildOrder;
  
  // Generate build order with realistic timings
  let currentTimeInSeconds = 0;
  buildItems.forEach((item, index) => {
    // Increment time realistically
    currentTimeInSeconds += Math.floor(Math.random() * 30) + 15;
    
    // Increment supply realistically
    if (!item.includes('Supply') && !item.includes('Pylon') && !item.includes('Overlord')) {
      currentSupply += Math.floor(Math.random() * 2) + 1;
    } else {
      currentSupply += 8;
    }
    
    // Format time
    const minutes = Math.floor(currentTimeInSeconds / 60);
    const seconds = currentTimeInSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    buildOrder.push({
      time: timeString,
      supply: currentSupply,
      action: item
    });
  });
  
  return buildOrder;
}

// Helper function to generate resource graph data
function generateResourceGraph(): { time: string; minerals: number; gas: number }[] {
  const resourceGraph = [];
  let minerals = 50;
  let gas = 0;
  
  for (let minute = 0; minute < 20; minute++) {
    // Resources tend to increase over time with some variations
    minerals += Math.floor(Math.random() * 200) + 100;
    
    // Gas starts after a few minutes
    if (minute > 2) {
      gas += Math.floor(Math.random() * 100) + 50;
    }
    
    // Sometimes we spend resources
    if (Math.random() > 0.7) {
      minerals -= Math.floor(Math.random() * 200);
      if (minerals < 0) minerals = 0;
      
      if (gas > 0 && Math.random() > 0.5) {
        gas -= Math.floor(Math.random() * 100);
        if (gas < 0) gas = 0;
      }
    }
    
    resourceGraph.push({
      time: `${minute}:00`,
      minerals,
      gas
    });
  }
  
  return resourceGraph;
}
