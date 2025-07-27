import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedReplayData {
  success: boolean;
  replayId: string;
  playerName: string;
  playerRace: string;
  opponentName: string;
  opponentRace: string;
  mapName: string;
  matchDurationSeconds: number;
  apm: number;
  eapm: number;
  buildOrder: BuildOrderItem[];
  keyMoments: string[];
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  message?: string;
  error?: string;
}

export interface BuildOrderItem {
  frame: number;
  gameTime: string;
  supply: string;
  action: string;
  unitOrBuilding: string;
}

interface ParsedReplayResponse {
  success: boolean;
  mapName: string;
  durationSeconds: number;
  players: Array<{
    id: number;
    name: string;
    race: string;
    apm: number;
    eapm: number;
  }>;
  buildOrders: Record<string, Array<{
    timestamp: string;
    action: string;
    unitName: string;
  }>>;
  error?: string;
}

export const useEnhancedReplayParser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseReplay = async (file: File): Promise<EnhancedReplayData> => {
    console.log('[Enhanced Parser] Starting analysis for:', file.name);
    setIsLoading(true);
    setError(null);

    try {
      // Validate file
      if (!file.name.toLowerCase().endsWith('.rep')) {
        throw new Error('Invalid file type. Only .rep files are supported.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      console.log('[Enhanced Parser] File validated, calling edge function...');

      // Prepare form data
      const formData = new FormData();
      formData.append('replay', file);

      // Call our enhanced parseReplay edge function
      const { data, error: functionError } = await supabase.functions.invoke('parseReplay', {
        body: formData,
      });

      if (functionError) {
        console.error('[Enhanced Parser] Edge function error:', functionError);
        throw new Error(`Parsing failed: ${functionError.message}`);
      }

      if (!data || !data.success) {
        console.error('[Enhanced Parser] Parse failed:', data);
        throw new Error(data?.error || 'Failed to parse replay');
      }

      const parsedData = data as ParsedReplayResponse;
      
      console.log('[Enhanced Parser] Success! Parsed data:', {
        map: parsedData.mapName,
        duration: parsedData.durationSeconds,
        players: parsedData.players?.length || 0,
        buildOrders: Object.keys(parsedData.buildOrders || {}).length
      });

      // Transform the new API response to match existing interface
      const players = parsedData.players || [];
      const player = players[0] || { name: 'Player 1', race: 'Unknown', apm: 0, eapm: 0 };
      const opponent = players[1] || { name: 'Player 2', race: 'Unknown', apm: 0, eapm: 0 };
      
      // Convert build orders format
      const buildOrder = Object.values(parsedData.buildOrders || {})[0] || [];
      const formattedBuildOrder = buildOrder.map((item) => ({
        frame: 0,
        gameTime: item.timestamp,
        supply: '?',
        action: item.action,
        unitOrBuilding: item.unitName
      }));

      return {
        success: true,
        replayId: `replay_${Date.now()}`,
        playerName: player.name,
        playerRace: player.race,
        opponentName: opponent.name,
        opponentRace: opponent.race,
        mapName: parsedData.mapName,
        matchDurationSeconds: parsedData.durationSeconds,
        apm: player.apm,
        eapm: player.eapm,
        buildOrder: formattedBuildOrder,
        keyMoments: [`Game duration: ${Math.floor(parsedData.durationSeconds / 60)}:${(parsedData.durationSeconds % 60).toString().padStart(2, '0')}`],
        analysis: {
          strengths: [`APM: ${player.apm}`, `EAPM: ${player.eapm}`],
          weaknesses: [],
          recommendations: []
        }
      };

    } catch (err) {
      console.error('[Enhanced Parser] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Return error state instead of throwing
      return {
        success: false,
        replayId: '',
        playerName: 'Parse Error',
        playerRace: 'Unknown',
        opponentName: 'Parse Error',
        opponentRace: 'Unknown',
        mapName: 'Parse Failed',
        matchDurationSeconds: 0,
        apm: 0,
        eapm: 0,
        buildOrder: [],
        keyMoments: [`Error: ${errorMessage}`],
        analysis: {
          strengths: [],
          weaknesses: ['Replay konnte nicht geparst werden'],
          recommendations: ['Überprüfe die .rep-Datei auf Kompatibilität mit SC:R']
        },
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplay,
    isLoading,
    error,
  };
};