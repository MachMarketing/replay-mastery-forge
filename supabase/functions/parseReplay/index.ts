
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[parseReplay] Processing replay file...')
    
    // Get the replay file as ArrayBuffer
    const arrayBuffer = await req.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    console.log(`[parseReplay] Received file of size: ${uint8Array.length} bytes`)
    
    // Basic file validation
    if (uint8Array.length < 1024) {
      throw new Error('File too small to be a valid replay')
    }
    if (uint8Array.length > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)')
    }
    
    // Import and use bwscrep for parsing
    const { parse } = await import("npm:bwscrep@latest")
    
    console.log('[parseReplay] Starting bwscrep parsing...')
    const parsed = await parse(uint8Array)
    console.log('[parseReplay] Parsing successful')
    
    // Log the structure for debugging
    console.log('[parseReplay] Parsed data keys:', Object.keys(parsed))
    if (parsed.players) {
      console.log('[parseReplay] Players found:', parsed.players.length)
    }
    
    // Return the parsed data
    return new Response(JSON.stringify(parsed), {
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      },
    })
  } catch (error) {
    console.error('[parseReplay] Error:', error)
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to parse replay file',
      details: error.toString()
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      },
    })
  }
})
