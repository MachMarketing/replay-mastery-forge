
import type { ParsedReplayData, ReplayAnalysis, PlayerData } from './types';
import type { ParsedReplayResult } from '../replayParserService';

// Make sure we're properly re-exporting all necessary types
export type { 
  ParsedReplayData, 
  ReplayAnalysis, 
  ParsedReplayResult,
  PlayerData
};

// Export any constants or utility functions that might be needed
export const RACES = ['Terran', 'Protoss', 'Zerg'];

// Helper functions for build order handling
export function normalizeBuildOrder(buildOrder: any[] | undefined): Array<{ time: string; supply: number; action: string }> {
  if (!buildOrder || !Array.isArray(buildOrder) || buildOrder.length === 0) {
    console.log('[replayParser] No build order to normalize');
    return [];
  }

  console.log(`[replayParser] Normalizing ${buildOrder.length} build order items`);
  
  return buildOrder.map(item => {
    // Make sure we have a valid time string format (mm:ss)
    let timeStr = item.time || '0:00';
    if (typeof timeStr === 'number') {
      const minutes = Math.floor(timeStr / 60);
      const seconds = Math.floor(timeStr % 60);
      timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return {
      time: timeStr,
      supply: typeof item.supply === 'number' ? item.supply : 0,
      action: item.action || 'Unknown Action'
    };
  });
}

// Debugging function to help track data flow
export function debugReplayData(data: Partial<ParsedReplayData>): void {
  console.log('[replayParser] Debug replay data:');
  console.log(`- Players: ${data.primaryPlayer?.name || 'Unknown'} vs ${data.secondaryPlayer?.name || 'Unknown'}`);
  console.log(`- Races: ${data.primaryPlayer?.race || 'Unknown'} vs ${data.secondaryPlayer?.race || 'Unknown'}`);
  console.log(`- APM: ${data.primaryPlayer?.apm || 0} vs ${data.secondaryPlayer?.apm || 0}`);
  console.log(`- Build Order Items: ${data.primaryPlayer?.buildOrder?.length || 0} items for primary player`);
  if (data.primaryPlayer?.buildOrder && data.primaryPlayer.buildOrder.length > 0) {
    console.log('- First few build order items:', data.primaryPlayer.buildOrder.slice(0, 3));
  }
}
