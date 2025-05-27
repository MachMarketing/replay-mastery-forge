
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '3600',
};

serve(async (req) => {
  console.log('[parseReplay] Request:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[parseReplay] Preflight:', req.method);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('[parseReplay] Processing replay...');
    const arrayBuffer = await req.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Validation
    if (uint8Array.length < 1024) throw new Error('File too small');
    if (uint8Array.length > 10 * 1024 * 1024) throw new Error('File too large');

    // Import screp-js as fallback parser
    const screpMod = await import('https://esm.sh/screp-js');
    console.log('[parseReplay] screpMod keys:', Object.keys(screpMod));
    const parse = screpMod.parse || screpMod.default?.parse;
    if (typeof parse !== 'function') throw new Error('screp-js.parse not found');

    // Parse replay
    console.log('[parseReplay] Starting parse');
    const parsed = await parse(uint8Array);
    console.log('[parseReplay] Parse successful');

    // Log header information
    console.log('[parseReplay] parsed.header:', parsed.header);
    console.log('[parseReplay] commands.length:', parsed.commands?.length || 0);
    console.log('[parseReplay] players.length:', parsed.players?.length || 0);

    // Normalize response to match Go service format
    const result = {
      players: parsed.players,
      commands: parsed.commands,
      header: {
        frames: parsed.header?.frames || 0,
        mapName: parsed.header?.mapName || 'Unknown Map',
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    console.error('[parseReplay] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
