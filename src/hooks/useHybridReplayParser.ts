import { useState } from 'react';
import { MetadataParser, type ReplayMetadata } from '@/services/replayParser/metadataParser';
import { uploadReplayFile, saveReplayMetadata } from '@/services/uploadService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HybridParsingResult {
  metadata: ReplayMetadata;
  serverAnalysis?: any;
  replayId?: string;
  analysisId?: string;
}

export interface HybridParsingProgress {
  stage: 'metadata' | 'upload' | 'server-parsing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function useHybridReplayParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<HybridParsingProgress>({
    stage: 'metadata',
    progress: 0,
    message: 'Ready to parse'
  });
  const { toast } = useToast();

  const parseReplay = async (file: File): Promise<HybridParsingResult> => {
    setIsLoading(true);
    
    try {
      // Phase 1: Client-side metadata extraction
      setProgress({
        stage: 'metadata',
        progress: 10,
        message: 'Extracting metadata...'
      });

      console.log('[HybridParser] Starting client-side metadata extraction');
      const metadata = await MetadataParser.parseMetadata(file);
      
      setProgress({
        stage: 'metadata',
        progress: 25,
        message: `Found: ${metadata.header.mapName} with ${metadata.players.length} players`
      });

      // Phase 2: Upload to Supabase Storage
      setProgress({
        stage: 'upload',
        progress: 35,
        message: 'Uploading replay file...'
      });

      const uploadResult = await uploadReplayFile(file);
      if (uploadResult.error) {
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }

      console.log('[HybridParser] File uploaded successfully:', uploadResult.data?.path);
      
      setProgress({
        stage: 'upload',
        progress: 50,
        message: 'File uploaded successfully'
      });

      // Phase 3: Save basic metadata to database
      const replayMetadata = {
        playerName: metadata.players[0]?.name || 'Unknown',
        opponentName: metadata.players[1]?.name || 'Unknown', 
        playerRace: metadata.players[0]?.race || 'Unknown',
        opponentRace: metadata.players[1]?.race || 'Unknown',
        map: metadata.header.mapName,
        duration: metadata.header.dateCreated, // Will be updated by server
        date: metadata.header.dateCreated,
        result: 'Pending Analysis',
        matchup: `${metadata.players[0]?.race?.charAt(0) || 'U'}v${metadata.players[1]?.race?.charAt(0) || 'U'}`
      };

      const saveResult = await saveReplayMetadata(
        uploadResult.data!.filename,
        file.name,
        replayMetadata
      );

      if (saveResult.error) {
        console.warn('[HybridParser] Failed to save metadata:', saveResult.error);
      }

      const replayId = saveResult.data?.id;

      // Phase 4: Server-side detailed parsing
      setProgress({
        stage: 'server-parsing',
        progress: 65,
        message: 'Starting detailed analysis...'
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[HybridParser] Calling screparsed server-side parser');
      const { data: serverResult, error: serverError } = await supabase.functions.invoke('parseReplayScreparsed', {
        body: {
          filePath: uploadResult.data!.path,
          userId: user.id
        }
      });

      if (serverError) {
        console.warn('[HybridParser] Server parsing failed:', serverError);
        // Continue with metadata-only result
        setProgress({
          stage: 'complete',
          progress: 100,
          message: 'Analysis completed with basic metadata'
        });

        toast({
          title: "Partial Success",
          description: "Basic metadata extracted, detailed analysis unavailable",
          variant: "default"
        });

        return {
          metadata,
          replayId,
          serverAnalysis: null
        };
      }

      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Complete analysis finished!'
      });

      console.log('[HybridParser] Hybrid parsing completed successfully');
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${metadata.header.mapName}`,
        variant: "default"
      });

      return {
        metadata,
        serverAnalysis: serverResult.data,
        replayId,
        analysisId: serverResult.analysisId
      };

    } catch (error) {
      console.error('[HybridParser] Parsing failed:', error);
      
      setProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplay,
    isLoading,
    progress
  };
}