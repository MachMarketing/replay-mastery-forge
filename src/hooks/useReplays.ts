
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Replay {
  id: string;
  player_name: string | null;
  opponent_name: string | null;
  player_race: string | null;
  opponent_race: string | null;
  map: string | null;
  matchup: string | null;
  date: string | null;
  result: string | null;
  duration: string | null;
  apm: number | null;
  eapm: number | null;
  created_at: string;
  filename: string;
  original_filename: string;
}

export const useReplays = () => {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReplays = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('replays')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setReplays(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error fetching replays',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReplays();
  }, []);

  const filterReplays = (
    searchQuery: string, 
    raceFilter: string, 
    resultFilter: string
  ) => {
    return replays.filter(replay => {
      // Search query filter
      const query = searchQuery.toLowerCase();
      if (
        query && 
        !replay.player_name?.toLowerCase().includes(query) &&
        !replay.opponent_name?.toLowerCase().includes(query) &&
        !replay.map?.toLowerCase().includes(query) &&
        !replay.matchup?.toLowerCase().includes(query)
      ) {
        return false;
      }
      
      // Race filter
      if (raceFilter && replay.matchup?.indexOf(raceFilter) === -1) {
        return false;
      }
      
      // Result filter
      if (resultFilter && replay.result !== resultFilter) {
        return false;
      }
      
      return true;
    });
  };

  return { replays, isLoading, error, fetchReplays, filterReplays };
};
