
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export async function uploadReplayFile(file: File): Promise<{
  error: any;
  data?: {
    path: string;
    filename: string;
  };
}> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return { error: new Error('User must be authenticated to upload files') };
    }

    // Generate a unique filename with user folder structure
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log('Uploading file to path:', filePath);

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('replays')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { error: uploadError };
    }

    return { 
      error: null, 
      data: { 
        path: filePath,
        filename: fileName
      } 
    };
  } catch (error) {
    console.error('Upload service error:', error);
    return { error };
  }
}

export async function saveReplayMetadata(
  filename: string, 
  originalFilename: string, 
  metadata: {
    playerName?: string;
    opponentName?: string;
    playerRace?: string;
    opponentRace?: string;
    map?: string;
    duration?: string;
    date?: string;
    result?: string;
    apm?: number;
    eapm?: number;
    matchup?: string;
  }
) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('No authenticated user found') };
    }

    const { data, error } = await supabase
      .from('replays')
      .insert({
        user_id: user.id,  // This now properly references the profiles table
        filename,
        original_filename: originalFilename,
        player_name: metadata.playerName,
        opponent_name: metadata.opponentName,
        player_race: metadata.playerRace,
        opponent_race: metadata.opponentRace,
        map: metadata.map,
        duration: metadata.duration,
        date: metadata.date,
        result: metadata.result,
        apm: metadata.apm,
        eapm: metadata.eapm,
        matchup: metadata.matchup
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error saving replay metadata:', error);
    return { data: null, error };
  }
}
