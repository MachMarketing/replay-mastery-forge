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
      formData.append('file', file);
      formData.append('fileName', file.name);

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

      console.log('[Enhanced Parser] Success! Parsed data:', {
        player: data.playerName,
        race: data.playerRace,
        opponent: data.opponentName,
        opponentRace: data.opponentRace,
        map: data.mapName,
        apm: data.apm,
        buildOrderLength: data.buildOrder?.length || 0
      });

      return {
        success: true,
        replayId: data.replayId,
        playerName: data.playerName,
        playerRace: data.playerRace,
        opponentName: data.opponentName,
        opponentRace: data.opponentRace,
        mapName: data.mapName,
        matchDurationSeconds: data.matchDurationSeconds,
        apm: data.apm,
        eapm: data.eapm,
        buildOrder: data.buildOrder || [],
        keyMoments: data.keyMoments || [],
        analysis: data.analysis || {
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        message: data.message
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