import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import screp-js from npm via esm.sh for Deno compatibility
import { parseReplay } from "https://esm.sh/screp-js@latest";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ParseReplay] Edge function called with screp-js parser');
    
    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('replay') as File;
    
    if (!file) {
      throw new Error('No replay file provided');
    }

    console.log('[ParseReplay] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    if (!file.name.endsWith('.rep')) {
      throw new Error('Invalid file type. Please upload a .rep file');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB');
    }

    // Read file as ArrayBuffer and convert to Buffer for screp-js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('[ParseReplay] File read, buffer size:', buffer.length);

    // Parse using screp-js
    console.log('[ParseReplay] Starting screp-js parsing...');
    const replay = parseReplay(buffer);

    console.log('[ParseReplay] screp-js parsing completed:', {
      mapName: replay.header?.mapName,
      playerCount: replay.header?.players?.length,
      commandCount: replay.commands?.length
    });

    // Extract data from screp-js result
    const mapName = replay.header?.mapName || 'Unknown Map';
    const durationSeconds = Math.floor((replay.header?.replayLength || 0) / 23.81); // Convert frames to seconds
    
    const players = (replay.header?.players || []).map((p: any, index: number) => ({
      id: index,
      name: p.name || `Player ${index + 1}`,
      race: p.race || 'Unknown',
      apm: p.apm || 0,
      eapm: p.eapm || 0
    }));

    // Process commands to extract build orders
    const commands = (replay.commands || []).map((c: any) => ({
      playerId: c.playerId || 0,
      frame: c.frame || 0,
      time: Math.floor((c.frame || 0) / 23.81), // Convert frames to seconds
      commandType: c.commandType || 'Unknown',
      abilityName: c.abilityName || 'Unknown Action'
    }));

    // Extract build orders for each player
    const buildOrders: Record<string, any[]> = {};
    
    players.forEach(player => {
      const playerCommands = commands
        .filter(c => c.playerId === player.id && ['Train', 'Build', 'Research', 'Upgrade'].includes(c.commandType))
        .sort((a, b) => a.frame - b.frame)
        .map(c => ({
          timestamp: `${Math.floor(c.time / 60)}:${(c.time % 60).toString().padStart(2, '0')}`,
          action: c.commandType,
          unitName: c.abilityName
        }));
      
      buildOrders[player.id.toString()] = playerCommands;
    });

    const responseData = {
      success: true,
      mapName,
      durationSeconds,
      players,
      buildOrders
    };

    console.log('[ParseReplay] Response prepared:', {
      success: responseData.success,
      mapName: responseData.mapName,
      durationSeconds: responseData.durationSeconds,
      playerCount: responseData.players.length,
      buildOrderCount: Object.keys(responseData.buildOrders).length
    });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ParseReplay] Error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      mapName: 'Parse Failed',
      durationSeconds: 0,
      players: [],
      buildOrders: {}
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});