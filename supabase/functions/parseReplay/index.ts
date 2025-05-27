import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
        if (req.method === 'OPTIONS') {
              return new Response(null, { headers: corsHeaders });
        }

        try {
              console.log('[parseReplay] Processing replay...');
              const arrayBuffer = await req.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);

      // Validation
      if (uint8Array.length < 1024) throw new Error('File too small');
              if (uint8Array.length > 10 * 1024 * 1024) throw new Error('File too large');

      // Import bwscrep from ESM CDN
      const bwscrepMod = await import('https://esm.sh/bwscrep@2.0.0');
              console.log('[parseReplay] bwscrepMod keys:', Object.keys(bwscrepMod));
              const parse = bwscrepMod.parse || bwscrepMod.default?.parse;
              if (typeof parse !== 'function') throw new Error('bwscrep.parse not found');

      // Parse replay
      console.log('[parseReplay] Starting parse');
              const parsed = await parse(uint8Array);
              console.log('[parseReplay] Parse successful');

      // Normalize response
      const result = {
              players: parsed.players,
              commands: parsed.commands,
              header: {
                        frames: parsed.header.frames,
                        mapName: parsed.header.mapName,
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
