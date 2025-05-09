
import { AdvancedMetrics, ExtendedReplayData } from './replayParser/types';

/**
 * Service for providing specialized analysis based on advanced replay metrics
 */

/**
 * Get overall performance rating from 1-10 based on extracted metrics
 */
export function getOverallPerformanceRating(data: ExtendedReplayData, playerIndex: number): number {
  const metrics = data.advancedMetrics;
  const playerKey = playerIndex === 0 ? 'player1' : 'player2';
  let score = 5; // Start at average score
  
  try {
    // APM component (0-2 points)
    const apm = playerIndex === 0 ? data.primaryPlayer.apm : data.secondaryPlayer.apm;
    if (apm > 200) score += 2;
    else if (apm > 150) score += 1.5;
    else if (apm > 100) score += 1;
    else if (apm > 70) score += 0.5;
    
    // Supply blocks component (0-1.5 points)
    const supplyBlocks = metrics.supplyManagement[playerKey].supplyBlocks.length;
    if (supplyBlocks === 0) score += 1.5;
    else if (supplyBlocks <= 2) score += 1;
    else if (supplyBlocks <= 4) score += 0.5;
    else score -= 0.5; // Penalty for many supply blocks
    
    // Resource efficiency component (0-1.5 points)
    const unspentMinerals = getAverageUnspentResources(metrics, playerKey);
    if (unspentMinerals < 300) score += 1.5;
    else if (unspentMinerals < 600) score += 1;
    else if (unspentMinerals < 1000) score += 0.5;
    else score -= 0.5; // Penalty for high unspent minerals
    
    // Production efficiency component (0-1.5 points)
    const idleTime = getProductionIdlePercentage(metrics, playerKey);
    if (idleTime < 15) score += 1.5;
    else if (idleTime < 25) score += 1;
    else if (idleTime < 35) score += 0.5;
    else score -= 0.5; // Penalty for high idle time
    
    // Expansion timing component (0-1 point)
    const expansions = metrics.expansionTiming[playerKey];
    if (expansions.length >= 2) {
      const firstExpTime = expansions[0]?.time || 0;
      if (firstExpTime > 0 && firstExpTime < 24 * 300) score += 1; // Early expand (before 5min)
      else if (firstExpTime < 24 * 480) score += 0.5; // Normal expand (before 8min)
    }
    
    // Hotkey usage component (0-1 point)
    const hotkeyAPM = metrics.hotkeyUsage[playerKey].hotkeyActionsPerMinute;
    if (hotkeyAPM > 30) score += 1;
    else if (hotkeyAPM > 15) score += 0.5;
    
    // Balance component (0-0.5 points)
    const macroPercent = metrics.actionDistribution[playerKey].macroPercentage;
    const microPercent = metrics.actionDistribution[playerKey].microPercentage;
    if ((macroPercent > 30 && microPercent > 30) || (macroPercent > 40 && microPercent > 20)) {
      score += 0.5; // Good balance
    }
    
    // Cap score between 1-10
    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  } catch (error) {
    console.error('[advancedMetricsService] Error calculating performance rating:', error);
    return 5; // Return average on error
  }
}

/**
 * Get average unspent resources from the metrics
 */
function getAverageUnspentResources(metrics: AdvancedMetrics, playerKey: 'player1' | 'player2'): number {
  try {
    const mineralData = metrics.resourceCollection[playerKey].unspentResources.minerals;
    if (mineralData.length === 0) return 500; // Default value
    
    // Skip the first few data points (early game naturally has low minerals)
    const relevantData = mineralData.slice(Math.min(3, mineralData.length - 1));
    const sum = relevantData.reduce((total, item) => total + item.value, 0);
    return Math.round(sum / relevantData.length);
  } catch (error) {
    return 500; // Default on error
  }
}

/**
 * Get production idle percentage from metrics
 */
function getProductionIdlePercentage(metrics: AdvancedMetrics, playerKey: 'player1' | 'player2'): number {
  try {
    const idleData = metrics.productionEfficiency[playerKey].idleProductionTime;
    if (idleData.length === 0) {
      // Try to calculate from facility data if available
      const facilityData = metrics.productionEfficiency[playerKey].productionFacilities;
      if (facilityData.length > 0) {
        const sum = facilityData.reduce((total, item) => total + item.idlePercentage, 0);
        return sum / facilityData.length;
      }
      return 25; // Default value
    }
    return idleData[0].percentage;
  } catch (error) {
    return 25; // Default on error
  }
}

/**
 * Get recommended areas of improvement based on metrics
 * Returns array of objects with area, score, and recommendation
 */
export function getImprovementAreas(data: ExtendedReplayData, playerIndex: number): Array<{
  area: string;
  score: number;
  recommendation: string;
}> {
  const metrics = data.advancedMetrics;
  const playerKey = playerIndex === 0 ? 'player1' : 'player2';
  const improvements: Array<{ area: string; score: number; recommendation: string }> = [];
  
  try {
    // Production efficiency
    const idleTime = getProductionIdlePercentage(metrics, playerKey);
    improvements.push({
      area: "Produktionseffizienz",
      score: calculateScore(100 - idleTime, 100, 60),
      recommendation: idleTime > 25 
        ? "Fokussiere dich auf kontinuierliche Produktion und reduziere Leerlaufzeiten" 
        : "Gute Produktionseffizienz. Halte die Konsistenz aufrecht."
    });
    
    // Supply management
    const supplyBlocks = metrics.supplyManagement[playerKey].supplyBlocks.length;
    const gameDurationMinutes = data.durationMS / (1000 * 60);
    const blocksPerMinute = gameDurationMinutes > 0 ? supplyBlocks / gameDurationMinutes : 0;
    
    improvements.push({
      area: "Supply-Management",
      score: calculateScore(10 - blocksPerMinute * 10, 10, 0),
      recommendation: supplyBlocks > 3
        ? `Reduziere Supply-Blocks (${supplyBlocks} im Spiel). Baue Supply-Gebäude rechtzeitig.`
        : "Gutes Supply-Management. Du vermeidest Supply-Blocks effektiv."
    });
    
    // Resource management
    const avgUnspentMinerals = getAverageUnspentResources(metrics, playerKey);
    improvements.push({
      area: "Ressourcenmanagement",
      score: calculateScore(2000 - avgUnspentMinerals, 2000, 0),
      recommendation: avgUnspentMinerals > 800
        ? `Hohe ungenutzte Mineralien (Ø${avgUnspentMinerals}). Verbessere dein Ausgaben-Management.`
        : "Effektive Ressourcennutzung. Du verwendest deine Ressourcen gut."
    });
    
    // Expansion timing
    const expansions = metrics.expansionTiming[playerKey].length;
    const firstExpansionTime = metrics.expansionTiming[playerKey][0]?.time || 0;
    const expansionScore = expansions === 0 ? 0 : 
                          firstExpansionTime === 0 ? 50 : 
                          firstExpansionTime < 24 * 300 ? 100 : // Before 5min
                          firstExpansionTime < 24 * 480 ? 75 : // Before 8min
                          50; // Late expansion
    
    improvements.push({
      area: "Expansion-Timing",
      score: expansionScore,
      recommendation: expansions === 0
        ? "Keine Expansionen erkannt. Erweitere deine Wirtschaft für mehr Ressourcen."
        : expansionScore < 70
          ? `Spätes Expansion-Timing. Expandiere früher für wirtschaftliche Vorteile.`
          : "Gutes Expansion-Timing. Du erweiterst deine Wirtschaft effektiv."
    });
    
    // Hotkey usage
    const hotkeyAPM = metrics.hotkeyUsage[playerKey].hotkeyActionsPerMinute;
    improvements.push({
      area: "Hotkey-Nutzung",
      score: calculateScore(hotkeyAPM, 50, 0),
      recommendation: hotkeyAPM < 15
        ? "Geringe Hotkey-Nutzung. Verwende mehr Kontrollgruppen für bessere Effizienz."
        : hotkeyAPM < 30
          ? "Moderate Hotkey-Nutzung. Erweitere deine Nutzung von Kontrollgruppen."
          : "Gute Hotkey-Nutzung. Du verwendest Kontrollgruppen effektiv."
    });
    
    // Macro vs Micro balance
    const macroPercent = metrics.actionDistribution[playerKey].macroPercentage;
    const microPercent = metrics.actionDistribution[playerKey].microPercentage;
    const balanceScore = Math.min(100, 
      100 - Math.abs(Math.min(macroPercent, 50) - Math.min(microPercent, 40)) * 2
    );
    
    improvements.push({
      area: "Makro-Mikro-Balance",
      score: balanceScore,
      recommendation: balanceScore < 70
        ? `${macroPercent > microPercent ? "Makro-Fokussiert" : "Mikro-Fokussiert"}. Arbeite an einer besseren Balance.`
        : "Gute Balance zwischen Makro- und Mikro-Management."
    });
    
    // Sort by score ascending (worst areas first)
    return improvements.sort((a, b) => a.score - b.score);
  } catch (error) {
    console.error('[advancedMetricsService] Error calculating improvement areas:', error);
    return [
      {
        area: "Allgemein",
        score: 50,
        recommendation: "Fokussiere dich auf grundlegende Mechaniken und Build Orders"
      }
    ];
  }
}

/**
 * Helper function to calculate a 0-100 score with min-max normalization
 */
function calculateScore(value: number, max: number, min: number): number {
  if (max === min) return 50;
  const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return Math.round(normalized);
}

/**
 * Get key match insights based on replay metrics
 */
export function getMatchInsights(data: ExtendedReplayData, playerIndex: number): string[] {
  const metrics = data.advancedMetrics;
  const playerKey = playerIndex === 0 ? 'player1' : 'player2';
  const insights: string[] = [];
  
  try {
    // Check for long supply blocks
    const longSupplyBlocks = metrics.supplyManagement[playerKey].supplyBlocks
      .filter(block => block.durationSeconds > 15);
    
    if (longSupplyBlocks.length > 0) {
      insights.push(
        `Du hattest ${longSupplyBlocks.length} längere Supply-Blocks, die deine Produktion verzögert haben.`
      );
    }
    
    // Check resource spikes
    const mineralSpikes = metrics.resourceCollection[playerKey].unspentResources.minerals
      .filter(point => point.value > 1000);
    
    if (mineralSpikes.length > 0) {
      insights.push(
        `Zu mehreren Zeitpunkten hattest du über 1000 ungenutzte Mineralien. Verbessere deine Ausgaben-Effizienz.`
      );
    }
    
    // Check army value trend
    const armyValuePoints = metrics.armyValueOverTime[playerKey].armyValueOverTime;
    if (armyValuePoints.length >= 3) {
      const lastThree = armyValuePoints.slice(-3);
      const trend = (lastThree[2].value - lastThree[0].value) / lastThree[0].value;
      
      if (trend > 0.5) {
        insights.push(
          `Starkes Wachstum deiner Armee zum Ende des Spiels (+${Math.round(trend * 100)}% in der späten Phase).`
        );
      } else if (trend < -0.2) {
        insights.push(
          `Deine Armeestärke nahm zum Ende des Spiels ab (-${Math.round(Math.abs(trend) * 100)}% in der späten Phase).`
        );
      }
    }
    
    // Check hotkey distribution
    const hotkeyData = metrics.hotkeyUsage[playerKey];
    const hotkeyCount = Object.keys(hotkeyData.hotkeyDistribution).length;
    
    if (hotkeyCount <= 2 && hotkeyData.hotkeyActions > 20) {
      insights.push(
        `Du verwendest nur ${hotkeyCount} Kontrollgruppen. Erweitere deine Hotkey-Nutzung für bessere Kontrolle.`
      );
    } else if (hotkeyCount >= 5) {
      insights.push(
        `Gute Nutzung von ${hotkeyCount} verschiedenen Kontrollgruppen für effizientes Management.`
      );
    }
    
    // Check production peaks and valleys
    const productionData = metrics.productionEfficiency[playerKey].productionFacilities;
    if (productionData.length >= 3) {
      const highIdleTimes = productionData.filter(point => point.idlePercentage > 40);
      
      if (highIdleTimes.length > Math.floor(productionData.length * 0.3)) {
        insights.push(
          `Zu ${Math.round(highIdleTimes.length / productionData.length * 100)}% der Spielzeit waren deine Produktionsgebäude zu über 40% inaktiv.`
        );
      }
    }
    
    // Check tech path
    const techPathItems = metrics.techPath[playerKey].length;
    if (techPathItems <= 1) {
      insights.push(
        `Limitierte technologische Entwicklung. Investiere in Tech-Gebäude und Upgrades für fortgeschrittenere Einheiten.`
      );
    } else if (techPathItems >= 5) {
      insights.push(
        `Gute technologische Entwicklung mit ${techPathItems} verschiedenen Tech-Investitionen.`
      );
    }
    
    // Check for unit composition specialization
    const lastComposition = metrics.armyValueOverTime[playerKey].unitComposition
      .slice(-1)[0]?.composition;
      
    if (lastComposition) {
      const unitTypes = Object.keys(lastComposition);
      const totalUnits = Object.values(lastComposition)
        .reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
      
      // Find the most common unit
      let mostCommonUnit = '';
      let mostCommonCount = 0;
      
      for (const [unit, count] of Object.entries(lastComposition)) {
        if (typeof count === 'number' && count > mostCommonCount) {
          mostCommonCount = count;
          mostCommonUnit = unit;
        }
      }
      
      if (mostCommonCount > 0 && totalUnits > 0) {
        const percentageMostCommon = Math.round((mostCommonCount / totalUnits) * 100);
        
        if (percentageMostCommon > 60) {
          insights.push(
            `Starker Fokus auf ${mostCommonUnit} (${percentageMostCommon}% deiner Armee). Eine diversere Komposition könnte gegen bestimmte Gegner effektiver sein.`
          );
        }
      }
    }
    
    // If no insights were found, add a general one
    if (insights.length === 0) {
      insights.push(
        "Ausgewogene Performance ohne nennenswerte Anomalien. Fokussiere dich auf kontinuierliche Verbesserung deiner Grundlagen."
      );
    }
    
    return insights;
  } catch (error) {
    console.error('[advancedMetricsService] Error calculating match insights:', error);
    return [
      "Kontinuierliche Arbeit an deiner Build Order und Makro-Mechaniken wird dein Spiel verbessern."
    ];
  }
}

/**
 * Get comparison between players based on advanced metrics
 */
export function getPlayerComparison(data: ExtendedReplayData): {
  player1: { stat: string; value: string | number; advantage: boolean }[];
  player2: { stat: string; value: string | number; advantage: boolean }[];
} {
  const metrics = data.advancedMetrics;
  const comparison = {
    player1: [] as { stat: string; value: string | number; advantage: boolean }[],
    player2: [] as { stat: string; value: string | number; advantage: boolean }[]
  };
  
  try {
    // APM comparison
    const player1APM = data.primaryPlayer.apm;
    const player2APM = data.secondaryPlayer.apm;
    comparison.player1.push({
      stat: "APM",
      value: player1APM,
      advantage: player1APM > player2APM
    });
    comparison.player2.push({
      stat: "APM",
      value: player2APM,
      advantage: player2APM > player1APM
    });
    
    // Supply blocks comparison
    const player1SupplyBlocks = metrics.supplyManagement.player1.supplyBlocks.length;
    const player2SupplyBlocks = metrics.supplyManagement.player2.supplyBlocks.length;
    comparison.player1.push({
      stat: "Supply-Blocks",
      value: player1SupplyBlocks,
      advantage: player1SupplyBlocks < player2SupplyBlocks // Fewer is better
    });
    comparison.player2.push({
      stat: "Supply-Blocks",
      value: player2SupplyBlocks,
      advantage: player2SupplyBlocks < player1SupplyBlocks
    });
    
    // Resource efficiency comparison
    const player1Resources = getAverageUnspentResources(metrics, 'player1');
    const player2Resources = getAverageUnspentResources(metrics, 'player2');
    comparison.player1.push({
      stat: "Ø Ungenutzte Mineralien",
      value: player1Resources,
      advantage: player1Resources < player2Resources // Lower is better
    });
    comparison.player2.push({
      stat: "Ø Ungenutzte Mineralien",
      value: player2Resources,
      advantage: player2Resources < player1Resources
    });
    
    // Production efficiency comparison
    const player1IdleTime = getProductionIdlePercentage(metrics, 'player1');
    const player2IdleTime = getProductionIdlePercentage(metrics, 'player2');
    comparison.player1.push({
      stat: "Produktions-Leerlaufzeit",
      value: `${player1IdleTime.toFixed(1)}%`,
      advantage: player1IdleTime < player2IdleTime // Lower is better
    });
    comparison.player2.push({
      stat: "Produktions-Leerlaufzeit",
      value: `${player2IdleTime.toFixed(1)}%`,
      advantage: player2IdleTime < player1IdleTime
    });
    
    // Expansions comparison
    const player1Expansions = metrics.expansionTiming.player1.length;
    const player2Expansions = metrics.expansionTiming.player2.length;
    comparison.player1.push({
      stat: "Anzahl Expansionen",
      value: player1Expansions,
      advantage: player1Expansions > player2Expansions
    });
    comparison.player2.push({
      stat: "Anzahl Expansionen",
      value: player2Expansions,
      advantage: player2Expansions > player1Expansions
    });
    
    // Hotkey APM comparison
    const player1HotkeyAPM = metrics.hotkeyUsage.player1.hotkeyActionsPerMinute;
    const player2HotkeyAPM = metrics.hotkeyUsage.player2.hotkeyActionsPerMinute;
    comparison.player1.push({
      stat: "Hotkey APM",
      value: player1HotkeyAPM,
      advantage: player1HotkeyAPM > player2HotkeyAPM
    });
    comparison.player2.push({
      stat: "Hotkey APM",
      value: player2HotkeyAPM,
      advantage: player2HotkeyAPM > player1HotkeyAPM
    });
    
    return comparison;
  } catch (error) {
    console.error('[advancedMetricsService] Error calculating player comparison:', error);
    return comparison;
  }
}
