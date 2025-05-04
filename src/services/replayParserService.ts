
/**
 * API for parsing StarCraft: Brood War replay files
 */
import { parseReplayInBrowser } from './browserReplayParser';
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
  // Add missing fields to fix TypeScript errors
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
 * Parse a StarCraft: Brood War replay file
 * This uses browser-based parsing (client-side WASM)
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('🚀 [replayParserService] Starting to parse file:', file.name);
  
  try {
    // Parse with browser-based parser
    const parsedData = await parseReplayInBrowser(file);
    console.log('🚀 [replayParserService] Browser parser returned data:', parsedData);
    
    // Enhance the parsed data with more analysis (but don't override actual data)
    const enrichedData = analyzeReplayData(parsedData);
    console.log('🚀 [replayParserService] Analysis complete with data keys:', 
      Object.keys(enrichedData).join(', '));
    
    // Verify race information
    console.log('🚀 [replayParserService] Race verification:', {
      playerRace: {
        original: parsedData.playerRace,
        standardized: standardizeRaceName(parsedData.playerRace)
      },
      opponentRace: {
        original: parsedData.opponentRace,
        standardized: standardizeRaceName(parsedData.opponentRace)
      }
    });
    
    if (!parsedData.playerRace || !parsedData.opponentRace) {
      console.warn('🚀 [replayParserService] Missing race data in parsed result');
    }
    
    // Log full enhanced data for debugging
    console.log('🚀 [replayParserService] Final enriched data:', {
      playerName: enrichedData.playerName,
      opponentName: enrichedData.opponentName,
      playerRace: enrichedData.playerRace,
      opponentRace: enrichedData.opponentRace,
      map: enrichedData.map,
      duration: enrichedData.duration,
      matchup: enrichedData.matchup
    });
    
    return enrichedData;
  } catch (error) {
    console.error('❌ [replayParserService] Error parsing replay file:', error);
    throw new Error(`Fehler beim Parsen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze replay data to enhance it with insights without overriding actual data
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
  } else {
    console.log('🧠 [replayParserService] Using existing build order with', buildOrder.length, 'items');
  }
  
  // Generate resources graph if not provided
  const resourcesGraph = parsedData.resourcesGraph || generateResourceData(durationMs);

  // Generate analysis only if not already present
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  
  // Check if we already have analysis data
  if (parsedData.strengths && parsedData.strengths.length > 0) {
    console.log('🧠 [replayParserService] Using existing strengths:', parsedData.strengths);
    strengths = parsedData.strengths;
  } else {
    console.log('🧠 [replayParserService] Generating strengths for race:', playerRace);
    strengths = generateStrengthsByRace(playerRace);
  }
  
  if (parsedData.weaknesses && parsedData.weaknesses.length > 0) {
    console.log('🧠 [replayParserService] Using existing weaknesses:', parsedData.weaknesses);
    weaknesses = parsedData.weaknesses;
  } else {
    console.log('🧠 [replayParserService] Generating weaknesses for race:', playerRace);
    weaknesses = generateWeaknessesByRace(playerRace);
  }
  
  if (parsedData.recommendations && parsedData.recommendations.length > 0) {
    console.log('🧠 [replayParserService] Using existing recommendations:', parsedData.recommendations);
    recommendations = parsedData.recommendations;
  } else {
    console.log('🧠 [replayParserService] Generating recommendations for matchup:', matchup);
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
  
  console.log('🧠 [replayParserService] Analysis complete with', 
    strengths.length, 'strengths,', 
    weaknesses.length, 'weaknesses,',
    recommendations.length, 'recommendations');

  // Combine parsed data with analysis, preserving the actual races from the replay
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
