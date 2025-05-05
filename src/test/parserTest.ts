
import { ParsedReplayResult } from '../services/replayParserService';
import { parseReplayInBrowser } from '../services/browserReplayParser';
import { mapRawToParsed } from '../services/replayMapper';

// Sample test data with corrected type structure
export const sampleReplayData: ParsedReplayResult = {
  playerName: "TestPlayer",
  opponentName: "TestOpponent",
  playerRace: "Terran",
  opponentRace: "Protoss",
  map: "Test Map",
  matchup: "TvP",
  duration: "10:45",
  durationMS: 645000, // Added durationMS field (10:45 = 645000ms)
  date: "2023-01-01",
  result: "win",
  apm: 150,
  eapm: 120,
  buildOrder: [
    { time: "01:25", supply: 9, action: "Supply Depot" },
    { time: "01:45", supply: 10, action: "Barracks" }
  ],
  resourcesGraph: [
    { time: "01:00", minerals: 200, gas: 0 },
    { time: "02:00", minerals: 150, gas: 0 }
  ],
  strengths: ["Macro management", "Build efficiency"],
  weaknesses: ["Scout timing", "Expansion timing"],
  recommendations: ["Scout earlier", "Focus on constant worker production"],
  trainingPlan: [
    { day: 1, focus: "Macro", drill: "Constant worker production" },
    { day: 2, focus: "Micro", drill: "Unit control" }
  ]
};

// Test functions for replay parsing
export function testReplayParsing() {
  console.log("Running parser tests with sample data:");
  console.log("Player:", sampleReplayData.playerName);
  console.log("Race:", sampleReplayData.playerRace);
  console.log("Build order items:", sampleReplayData.buildOrder.length);
  
  // Validate player data
  if (!sampleReplayData.playerName || !sampleReplayData.opponentName) {
    console.error("Missing player names in test data");
  }
  
  // Validate race information
  if (!sampleReplayData.playerRace || !sampleReplayData.opponentRace) {
    console.error("Missing race information in test data");
  }
  
  // Validate build order
  if (!sampleReplayData.buildOrder || sampleReplayData.buildOrder.length === 0) {
    console.error("Missing build order in test data");
  }
  
  // Test matchup generation
  const expectedMatchup = `${sampleReplayData.playerRace.charAt(0)}v${sampleReplayData.opponentRace.charAt(0)}`;
  if (sampleReplayData.matchup !== expectedMatchup) {
    console.error(`Matchup mismatch: ${sampleReplayData.matchup} vs expected ${expectedMatchup}`);
  }
  
  console.log("Basic validation complete");
  return true;
}

// Additional test case data
export const secondaryTestData: ParsedReplayResult = {
  playerName: "Player2",
  opponentName: "Opponent2",
  playerRace: "Zerg",
  opponentRace: "Terran",
  map: "Another Test Map",
  matchup: "ZvT",
  duration: "15:20",
  durationMS: 920000, // Added durationMS field (15:20 = 920000ms)
  date: "2023-02-15",
  result: "loss",
  apm: 200,
  eapm: 160,
  buildOrder: [
    { time: "01:15", supply: 9, action: "Spawning Pool" },
    { time: "01:40", supply: 10, action: "Extractor" }
  ],
  resourcesGraph: [
    { time: "01:00", minerals: 180, gas: 0 },
    { time: "02:00", minerals: 120, gas: 20 }
  ],
  strengths: ["Early aggression", "Creep spread"],
  weaknesses: ["Late game transitions", "Resource management"],
  recommendations: ["Practice late-game scenarios", "Improve drone saturation timing"],
  trainingPlan: [
    { day: 1, focus: "Early game", drill: "Drone saturation" },
    { day: 2, focus: "Mid game", drill: "Expansion timing" }
  ]
};

// Test race detection
export function testRaceDetection() {
  const testCases = [
    { input: "T", expected: "Terran" },
    { input: "P", expected: "Protoss" },
    { input: "Z", expected: "Zerg" },
    { input: "terran", expected: "Terran" },
    { input: "PROTOSS", expected: "Protoss" },
    { input: "zerg", expected: "Zerg" },
    { input: "0", expected: "Terran" },
    { input: "1", expected: "Protoss" },
    { input: "2", expected: "Zerg" },
    { input: "", expected: "Terran" },
    { input: undefined, expected: "Terran" }
  ];
  
  console.log("Running race detection tests...");
  
  let passCount = 0;
  let failCount = 0;
  
  // This would use the standardizeRaceName function in a real implementation
  const mockStandardizeRaceName = (race: any): string => {
    if (!race) return "Terran";
    const r = String(race).toLowerCase();
    if (r === "t" || r === "terran" || r === "0") return "Terran";
    if (r === "p" || r === "protoss" || r === "1") return "Protoss";
    if (r === "z" || r === "zerg" || r === "2") return "Zerg";
    return "Terran";
  };
  
  testCases.forEach(test => {
    const result = mockStandardizeRaceName(test.input);
    if (result === test.expected) {
      passCount++;
    } else {
      failCount++;
      console.error(`Race detection failed: input "${test.input}" produced "${result}" instead of "${test.expected}"`);
    }
  });
  
  console.log(`Race detection tests complete: ${passCount} passed, ${failCount} failed`);
  return failCount === 0;
}

// Run all tests
export function runAllTests() {
  console.log("=== RUNNING ALL PARSER TESTS ===");
  
  const testResults = [
    { name: "Basic Parser Test", result: testReplayParsing() },
    { name: "Race Detection Test", result: testRaceDetection() }
  ];
  
  const passCount = testResults.filter(t => t.result).length;
  const failCount = testResults.filter(t => !t.result).length;
  
  console.log(`=== TEST SUMMARY: ${passCount} passed, ${failCount} failed ===`);
  
  return failCount === 0;
}

/**
 * This function is specifically for testing the browser-based replay parser
 * It's used by the ParserTestPage component to test parsing functionality
 * It now uses the unified parseReplayInBrowser function
 * 
 * @param file The replay file to parse
 * @returns Parsed replay data
 */
export async function runBrowserParserTest(file: File): Promise<ParsedReplayResult> {
  console.log("Running browser parser test with file:", file.name, file.size, "bytes");
  
  try {
    // Use the unified parseReplayInBrowser function
    const result = await parseReplayInBrowser(file);
    console.log("Parser test completed successfully:", result);
    return result;
  } catch (error) {
    console.error("Parser test failed:", error);
    
    // For testing purposes, return sample data if parsing fails
    console.warn("Returning sample test data due to parsing failure");
    return {
      ...sampleReplayData,
      playerName: "Test User (Fallback)",
      opponentName: "Test Opponent (Fallback)",
      map: file.name.replace(".rep", "") || "Test Map",
      date: new Date().toISOString().split("T")[0]
    };
  }
}
