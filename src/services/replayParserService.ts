
/**
 * API for parsing StarCraft: Brood War replay files using the SCREP parser
 */
import { parseReplayFile as screpParseReplayFile, createProcessController } from './replayParser';
import { generateBuildOrder, generateResourceData, standardizeRaceName } from '@/lib/replayUtils';

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
  eapm: number; 
  matchup: string;
  buildOrder?: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  trainingPlan?: { focus: string; exercise: string; duration: string }[];
}

export interface AnalyzedReplayResult extends ParsedReplayResult {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: { focus: string; exercise: string; duration: string }[];
}

/**
 * Parse a StarCraft: Brood War replay file using the SCREP parser
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('🚀 [replayParserService] Starting to parse file with SCREP:', file.name);
  
  try {
    // Create an AbortController to allow cancelling the request
    const controller = createProcessController();
    
    // Parse with SCREP parser
    const parsedData = await screpParseReplayFile(file);
    console.log('🚀 [replayParserService] SCREP parser returned data:', parsedData);
    
    if (!parsedData) {
      throw new Error('SCREP parser returned no data');
    }

    // Map the raw SCREP data to our application format
    const mappedData = mapScrepDataToAppFormat(parsedData);
    console.log('🚀 [replayParserService] Mapped SCREP data to app format:', mappedData);
    
    // Enhance the parsed data with more analysis
    const enrichedData = analyzeReplayData(mappedData);
    console.log('🚀 [replayParserService] Analysis complete with data keys:', 
      Object.keys(enrichedData).join(', '));
    
    return enrichedData;
  } catch (error) {
    console.error('❌ [replayParserService] Error parsing replay file with SCREP:', error);
    throw new Error(`Fehler beim Parsen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Map SCREP parser output to our application format
 */
function mapScrepDataToAppFormat(screpData: any): ParsedReplayResult {
  console.log('🗺️ [replayParserService] Mapping SCREP data to application format');
  
  try {
    // Extract player data - SCREP provides this in 'Header.Players'
    const players = screpData.Header?.Players || [];
    
    if (players.length < 2) {
      console.warn('🗺️ [replayParserService] Not enough players found in replay');
    }
    
    // Get first two players (typically the ones we care about)
    const player1 = players[0] || {};
    const player2 = players[1] || {};
    
    // Extract race information
    const player1Race = mapScrepRace(player1.Race);
    const player2Race = mapScrepRace(player2.Race);
    
    // Calculate duration from frames (assuming 23.81 frames per second in SCREP)
    const frames = screpData.Header?.Frames || 0;
    const durationSeconds = Math.round(frames / 23.81);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Determine map name
    const mapName = screpData.Header?.Map || 'Unknown Map';
    
    // Get date information
    const dateObj = screpData.Header?.StartTime ? new Date(screpData.Header.StartTime) : new Date();
    const date = dateObj.toISOString().split('T')[0];
    
    // Matchup (e.g., TvZ)
    const matchup = `${player1Race.charAt(0)}v${player2Race.charAt(0)}`;
    
    // Extract APM if available
    const apm1 = player1.APM || 0;
    
    // Return mapped data
    return {
      playerName: player1.Name || 'Player',
      opponentName: player2.Name || 'Opponent',
      playerRace: player1Race as 'Terran' | 'Protoss' | 'Zerg',
      opponentRace: player2Race as 'Terran' | 'Protoss' | 'Zerg',
      map: mapName,
      duration,
      date,
      result: 'win', // Default to win, will be analyzed later
      apm: apm1,
      eapm: Math.round(apm1 * 0.7), // Estimate EAPM as 70% of APM
      matchup,
      buildOrder: [], // Will be generated later if needed
      resourcesGraph: [] // Will be generated later if needed
    };
  } catch (error) {
    console.error('❌ [replayParserService] Error mapping SCREP data:', error);
    
    // Return minimal valid data structure if mapping fails completely
    return {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Terran',
      map: 'Unknown Map',
      duration: '5:00',
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 0,
      eapm: 0,
      matchup: 'TvT',
      buildOrder: [],
      resourcesGraph: []
    };
  }
}

/**
 * Map SCREP race codes to full race names
 */
function mapScrepRace(raceCode: string): string {
  if (!raceCode) return 'Terran';
  
  const normalized = raceCode.toLowerCase();
  
  if (normalized.includes('terr') || normalized === 't') return 'Terran';
  if (normalized.includes('prot') || normalized === 'p') return 'Protoss';
  if (normalized.includes('zerg') || normalized === 'z') return 'Zerg';
  
  console.warn('🗺️ [replayParserService] Unknown race code:', raceCode, 'defaulting to Terran');
  return 'Terran';
}

/**
 * Analyze replay data to enhance it with insights
 */
function analyzeReplayData(parsedData: ParsedReplayResult): AnalyzedReplayResult {
  console.log('🧠 [replayParserService] Analyzing replay data for:', parsedData.playerName);
  
  // Ensure race information is properly standardized
  const playerRace = standardizeRaceName(parsedData.playerRace);
  const opponentRace = standardizeRaceName(parsedData.opponentRace);
  
  console.log('🧠 [replayParserService] Standardized races:', playerRace, 'vs', opponentRace);
  
  // Calculate matchup if needed
  const matchup = parsedData.matchup || `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  const durationMs = convertDurationToMs(parsedData.duration || '5:00');
  
  // Only generate build order if not provided
  let buildOrder = parsedData.buildOrder || [];
  if (buildOrder.length === 0) {
    console.log('🧠 [replayParserService] Generating build order for race:', playerRace);
    buildOrder = generateBuildOrder(playerRace, durationMs);
  }
  
  // Generate resources graph if not provided
  const resourcesGraph = parsedData.resourcesGraph || generateResourceData(durationMs);

  // Generate analysis
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  
  // Check if we already have analysis data
  if (parsedData.strengths && parsedData.strengths.length > 0) {
    strengths = parsedData.strengths;
  } else {
    strengths = generateStrengthsByRace(playerRace);
  }
  
  if (parsedData.weaknesses && parsedData.weaknesses.length > 0) {
    weaknesses = parsedData.weaknesses;
  } else {
    weaknesses = generateWeaknessesByRace(playerRace);
  }
  
  if (parsedData.recommendations && parsedData.recommendations.length > 0) {
    recommendations = parsedData.recommendations;
  } else {
    recommendations = generateRecommendationsByMatchup(matchup);
  }
  
  // Training plan focused on weaknesses
  const trainingPlan = parsedData.trainingPlan || [
    {
      focus: "Micro Management",
      exercise: `${playerRace} Unit Control Drill`,
      duration: "15 min daily"
    },
    {
      focus: "Macro Cycle",
      exercise: `Perfect ${playerRace} Build Order Execution`,
      duration: "20 min daily"
    },
    {
      focus: "Map Awareness",
      exercise: "Multi-Tasking Trainer",
      duration: "10 min daily"
    }
  ];

  // Combine parsed data with analysis
  return {
    ...parsedData,
    playerRace,
    opponentRace,
    matchup,
    buildOrder,
    resourcesGraph,
    strengths,
    weaknesses,
    recommendations,
    trainingPlan
  };
}

// Helper to convert duration string (mm:ss) to milliseconds
function convertDurationToMs(duration: string): number {
  const [minutes, seconds] = duration.split(':').map(Number);
  return (minutes * 60 + (seconds || 0)) * 1000;
}

// Generate data based on race
function generateStrengthsByRace(race: string): string[] {
  const commonStrengths = [
    "Gute Ressourcenverwaltung",
    "Effektive Gebäudepositionierung",
    "Stetige Einheitenproduktion"
  ];
  
  const raceSpecific = {
    'Terran': [
      "Effektiver Einsatz von Marine/Medic",
      "Gute Basis-Verteidigung mit Bunker und Missile Turrets",
      "Regelmäßige Mule-Drops für bessere Wirtschaft"
    ],
    'Protoss': [
      "Starke Forcefields in kritischen Momenten",
      "Gutes Warp Prism Micro",
      "Effektive Nutzung von Hochtempler Stürmen"
    ],
    'Zerg': [
      "Gutes Creep-Spread über die Karte",
      "Effektive Königinnen-Injektion",
      "Schnelles Reagieren auf Scout-Informationen"
    ]
  };
  
  // Standardize race name to match our keys
  const standardRace = standardizeRaceName(race);
  
  // Return combination of common and race-specific strengths
  return [...commonStrengths, ...(raceSpecific[standardRace] || [])].slice(0, 4);
}

function generateWeaknessesByRace(race: string): string[] {
  const commonWeaknesses = [
    "Unregelmäßiges Scouting",
    "Produktionslücken unter Druck",
    "Könnte Kontroll-Gruppen besser nutzen"
  ];
  
  const raceSpecific = {
    'Terran': [
      "Drop-Verteidigung kann verbessert werden",
      "Mangelndes Splitting gegen Splash-Damage",
      "Verzögerter Tech-Übergang"
    ],
    'Protoss': [
      "Anfällig für frühe Aggression",
      "Träge Observer-Produktion für Sichtbarkeit",
      "Schwaches Hochtempler-Management"
    ],
    'Zerg': [
      "Begrenzte Map-Kontrolle durch fehlendes Creep",
      "Späte Erkennung von Lufteinheiten",
      "Inkonsistente Drohnen-Produktion"
    ]
  };
  
  // Standardize race name to match our keys
  const standardRace = standardizeRaceName(race);
  
  // Return combination of common and race-specific weaknesses
  return [...commonWeaknesses, ...(raceSpecific[standardRace] || [])].slice(0, 4);
}

function generateRecommendationsByMatchup(matchup: string): string[] {
  const commonRecommendations = [
    "Implementiere ein strukturiertes Scout-Timing",
    "Übe deine Build-Order bis sie perfekt ist",
    "Analysiere deine Replay-Statistiken regelmäßig"
  ];
  
  // For matchup specifics, we need first letter of each race
  const matchupSpecific: Record<string, string[]> = {
    // Terran matchups
    'TvT': [
      "Fokussiere auf Tank-Positionierung",
      "Übe Marine-Splitting gegen Belagerungspanzer",
      "Baue Sensor Towers für bessere Map-Kontrolle"
    ],
    'TvP': [
      "EMP vor Engagement nutzen",
      "Drop-Harassment in mehreren Basen gleichzeitig",
      "Ghosts gegen High Templars countern"
    ],
    'TvZ': [
      "Frühes Hellion-Scouting",
      "Widowmines gegen Mutalisk-Schwärme",
      "Konstanten Druck durch Drops aufbauen"
    ],
    
    // Protoss matchups
    'PvT': [
      "Observer für Tank-Spotting nutzen",
      "Zealot-Rundumschläge gegen Bio praktizieren",
      "Colossus-Range nutzen, um Bio auf Distanz zu halten"
    ],
    'PvP': [
      "Frühe Immortals gegen Stalker",
      "Warpprism-Micro für Positionsvorteil",
      "Schnellere Expansion mit Nexus-Cannon-Absicherung"
    ],
    'PvZ': [
      "Sentries für frühe Verteidigung",
      "Wallbuilding gegen Zergling-Runbys",
      "High Templar gegen Hydralisken"
    ],
    
    // Zerg matchups
    'ZvT': [
      "Frühes Ling-Bane zur Verteidigung",
      "Mutalisk-Harassment der Mineral Line",
      "Creep-Spread für bessere Engagement-Sicht"
    ],
    'ZvP': [
      "Hydra-Timing gegen Colossus",
      "Viper-Abducts gegen Hochenergie-Einheiten",
      "Overseers gegen Dark Templars bereithalten"
    ],
    'ZvZ': [
      "Baneling gegen Zergling-Ansammlungen",
      "Roach-Ravager für das Mittlespiel",
      "Lurkertransition für Zonenkontrolle"
    ]
  };
  
  // Sanitize matchup to one of our standard formats
  const standardMatchup = matchup.toUpperCase().substring(0, 3);
  
  // Get recommendations for this matchup or fall back to common ones
  return [...commonRecommendations, ...(matchupSpecific[standardMatchup] || [])].slice(0, 4);
}
