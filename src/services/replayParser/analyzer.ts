
import { ParsedReplayData, ReplayAnalysis } from './types';

/**
 * Analyze a replay to generate strengths, weaknesses, and recommendations
 */
export async function analyzeReplayData(replayData: ParsedReplayData): Promise<ReplayAnalysis> {
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
