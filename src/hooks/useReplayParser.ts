
import { useState } from 'react';
import { parseReplayFile as parseWithJSSUH } from '@/services/replayParserService';
import { analyzeReplayData } from '@/services/replayParser';
import type { ParsedReplayData, ReplayAnalysis } from '@/services/replayParser/types';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<{
    parsedData: ParsedReplayData | null;
    analysis: ReplayAnalysis | null;
  }>;
  isProcessing: boolean;
  error: string | null;
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseReplay = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Only StarCraft replay files (.rep) are allowed');
      }
      
      // Parse the replay file using jssuh directly
      console.log('Starting replay parsing with jssuh');
      const rawParsedData = await parseWithJSSUH(file);
      
      if (!rawParsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      // Transform the raw data into our application format
      console.log('Transforming parsed data');
      const { header } = rawParsedData;
      const players = header.players || [];
      
      const playerInfo = players[0] || { name: 'Unknown', race: 'T' };
      const opponentInfo = players[1] || { name: 'Unknown', race: 'T' };
      
      const ms = header.durationMS || 0;
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const parsedData: ParsedReplayData = {
        playerName: playerInfo.name || 'Unknown',
        opponentName: opponentInfo.name || 'Unknown',
        playerRace: mapRace(playerInfo.race || 'T'),
        opponentRace: mapRace(opponentInfo.race || 'T'),
        map: header.mapName || 'Unknown Map',
        duration,
        date: header.gameStartDate ? new Date(header.gameStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        result: 'win', // Default to win as jssuh doesn't provide game result directly
        apm: estimateAPM(rawParsedData.actions, ms),
        matchup: `${playerInfo.race}v${opponentInfo.race}`,
        buildOrder: extractBuildOrder(rawParsedData.actions || []),
        resourcesGraph: []
      };
      
      // Analyze the parsed data
      console.log('Starting replay analysis');
      const analysis = await analyzeReplayData(parsedData);
      
      return { parsedData, analysis };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error processing replay';
      setError(errorMessage);
      toast({
        title: 'Error Processing Replay',
        description: errorMessage,
        variant: 'destructive',
      });
      return { parsedData: null, analysis: null };
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to map race codes to full names
  function mapRace(race: string): 'Terran' | 'Protoss' | 'Zerg' {
    switch (race.toUpperCase()) {
      case 'T': return 'Terran';
      case 'P': return 'Protoss';
      case 'Z': return 'Zerg';
      default: return 'Terran';
    }
  }
  
  // Estimate APM from actions
  function estimateAPM(actions: any[], durationMs: number): number {
    if (!actions || !actions.length || !durationMs) return 0;
    const gameMinutes = durationMs / 60000;
    return Math.round(actions.length / (gameMinutes || 1));
  }
  
  // Extract build order from commands
  function extractBuildOrder(actions: any[]): { time: string; supply: number; action: string }[] {
    const buildOrderItems = actions
      .filter(action => action.type === 'train' || action.type === 'build' || action.type === 'research')
      .slice(0, 20);
      
    return buildOrderItems.map(action => {
      const timeMs = action.frame * (1000 / 24); // Convert frames to ms
      const minutes = Math.floor(timeMs / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);
      
      return {
        time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        supply: action.supply || 0,
        action: action.unit || action.building || action.upgrade || 'Unknown'
      };
    });
  }

  return {
    parseReplay,
    isProcessing,
    error
  };
}
