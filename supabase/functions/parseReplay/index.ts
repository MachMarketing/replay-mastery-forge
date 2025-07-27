import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting replay parsing...')
    
    // Get the uploaded file
    const formData = await req.formData()
    const file = formData.get('replayFile') as File
    
    if (!file) {
      console.error('No replay file found in request')
      return new Response(
        JSON.stringify({ error: 'No replay file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    console.log('File converted to buffer, attempting to parse...')

    // Import screp-js dynamically
    const { parseReplay } = await import('https://esm.sh/screp-js@latest')
    
    // Parse the replay
    const replay = parseReplay(buffer)
    
    console.log('Replay parsed successfully')

    // Extract basic info
    const mapName = replay.header?.mapName || 'Unknown Map'
    const durationSeconds = replay.header?.replayLength || 0

    // Extract player info
    const players = (replay.header?.players || []).map((p: any, index: number) => ({
      id: p.playerId || index,
      name: p.name || `Player ${index + 1}`,
      race: p.race || 'Unknown',
      apm: p.apm || 0,
      eapm: p.eapm || 0,
    }))

    console.log(`Found ${players.length} players`)

    // Extract all commands/actions
    const actions = (replay.commands || []).map((c: any) => ({
      playerId: c.playerId || 0,
      frame: c.frame || 0,
      time: Number((c.frame / 16).toFixed(2)) || 0,
      commandType: c.commandType || 'Unknown',
      abilityName: c.abilityName || 'Unknown',
    }))

    console.log(`Found ${actions.length} actions`)

    // Extract build orders (only Train and Build commands)
    const buildOrders = players.map((p: any) => ({
      playerId: p.id,
      sequence: actions
        .filter((a: any) => a.playerId === p.id && ['Train', 'Build'].includes(a.commandType))
        .map((a: any) => ({
          unit: a.abilityName,
          action: a.commandType,
          frame: a.frame,
          time: a.time,
        })),
    }))

    const result = {
      success: true,
      mapName,
      durationSeconds,
      players,
      buildOrders,
      actions,
      // Legacy format compatibility
      playerName: players[0]?.name || 'Unknown',
      playerRace: players[0]?.race || 'Unknown', 
      opponentName: players[1]?.name || 'Unknown',
      opponentRace: players[1]?.race || 'Unknown',
      apm: players[0]?.apm || 0,
      buildOrder: buildOrders[0]?.sequence || [],
    }

    console.log('Returning parsed result:', {
      mapName: result.mapName,
      playerCount: result.players.length,
      actionCount: result.actions.length,
      buildOrderLength: result.buildOrder.length
    })

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Replay parsing failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to parse replay file' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})