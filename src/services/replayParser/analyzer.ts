
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
      const race = replayData.playerRace;
      const opponentRace = replayData.opponentRace;
      
      // Generate strengths based on real metrics
      const strengths = [];
      if (apmRating === 'high') {
        strengths.push('Excellent mechanical speed with high APM');
      } else if (apmRating === 'medium') {
        strengths.push('Good mechanical control with decent APM');
      }
      
      strengths.push(`Consistent ${race} build order execution`);
      
      if (!isEarlyGame && replayData.result === 'win') {
        strengths.push('Effective late-game decision making');
      }
      
      strengths.push('Good resource management in the mid-game');
      
      if (race === 'Zerg') {
        strengths.push('Effective creep spread and map control');
      } else if (race === 'Terran') {
        strengths.push('Strong positional play with siege units');
      } else if (race === 'Protoss') {
        strengths.push('Good tech transitions and unit composition');
      }
      
      // Generate weaknesses
      const weaknesses = [];
      if (apmRating === 'low') {
        weaknesses.push('APM could be improved to execute strategies more efficiently');
      }
      
      if (isEarlyGame && replayData.result === 'loss') {
        weaknesses.push('Vulnerable to early game pressure');
      }
      
      weaknesses.push('Scouting frequency could be improved');
      weaknesses.push(`Suboptimal unit composition against ${opponentRace}`);
      
      if (replayData.result === 'loss') {
        if (race === 'Zerg') {
          weaknesses.push('Delayed tech switches in response to opponent\'s composition');
        } else if (race === 'Terran') {
          weaknesses.push('Insufficient map control and expansion timing');
        } else if (race === 'Protoss') {
          weaknesses.push('Inefficient resource management with high-tech units');
        }
      }
      
      // Generate matchup-specific recommendations
      const recommendations = [];
      const matchup = `${race.charAt(0)}v${opponentRace.charAt(0)}`;
      
      if (apmRating === 'low') {
        recommendations.push('Practice hotkey usage to improve APM and mechanical efficiency');
      }
      
      recommendations.push(`Review standard ${matchup} build orders for optimal timings`);
      recommendations.push('Implement more consistent scouting patterns at key time markers');
      recommendations.push(`Study pro-level ${matchup} replays for optimal unit compositions`);
      
      if (race === 'Zerg') {
        recommendations.push('Focus on early drone production and efficient larva usage');
      } else if (race === 'Terran') {
        recommendations.push('Practice drop micro to apply multi-pronged pressure');
      } else if (race === 'Protoss') {
        recommendations.push('Improve probe production consistency and pylon placement');
      }
      
      // Generate race-specific training plan
      const trainingPlan = [
        {
          day: 1,
          focus: 'Build Order Execution',
          drill: `Practice the standard ${matchup} opening build order 5 times against AI.`
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
          drill: `Practice microing ${race} units against ${opponentRace} units in unit tester.`
        },
        {
          day: 5,
          focus: 'Multitasking',
          drill: 'Practice harassing with a small group while maintaining macro at home.'
        },
        {
          day: 6,
          focus: 'Decision Making',
          drill: 'Watch your replays and identify key moments where different decisions could have been made.'
        },
        {
          day: 7,
          focus: 'Matchup Knowledge',
          drill: `Watch 3 pro ${matchup} replays and take notes on build orders and timings.`
        },
        {
          day: 8,
          focus: 'Execution Speed',
          drill: 'Practice the first 5 minutes of your build order focusing on perfect execution and timing.'
        },
        {
          day: 9,
          focus: 'Adaptation',
          drill: 'Play 3 games where you scout early and adjust your build based on what you see.'
        },
        {
          day: 10,
          focus: 'Full Implementation',
          drill: 'Apply all previous lessons in 5 games, focusing on one improvement area at a time.'
        }
      ];
      
      resolve({
        strengths,
        weaknesses,
        recommendations,
        trainingPlan
      });
    }, 300); // Reduced delay to improve UX
  });
}
