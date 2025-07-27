import { serve } from 'https://deno.land/std@0.181.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function handler(req: Request): Promise<Response> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('parseReplay function called')
    
    const formData = await req.formData()
    const file = formData.get('replayFile') as File
    
    if (!file) {
      console.error('No replay file provided')
      return new Response(JSON.stringify({ error: 'No replay file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`)

    // Import screp-js dynamically and use parseBuffer (not parseReplay)
    try {
      console.log('Attempting to import screp-js...')
      const screpModule = await import('https://esm.sh/screp-js@0.3.0')
      console.log('screp-js imported successfully:', Object.keys(screpModule))
      
      const buffer = new Uint8Array(await file.arrayBuffer())
      console.log('File converted to buffer')
      
      // Use parseBuffer which is the correct function name in screp-js@0.3.0
      const { parseBuffer } = screpModule
      if (!parseBuffer) {
        throw new Error('parseBuffer function not found in screp-js module')
      }
      
      console.log('Parsing replay...')
      const replay = parseBuffer(buffer)
      console.log('Replay parsed successfully, structure:', JSON.stringify(replay, null, 2))

      const mapName = replay.header?.mapName || 'Unknown'
      const durationSeconds = replay.header?.replayLength || 0

      const players = (replay.header?.players || []).map((p: any) => ({
        id: p.playerId, 
        name: p.name, 
        race: p.race, 
        apm: p.apm, 
        eapm: p.eapm,
      }))

      const actions = (replay.commands || []).map((c: any) => ({
        playerId: c.playerId,
        frame: c.frame,
        time: +(c.frame / 16).toFixed(2),
        commandType: c.commandType,
        abilityName: c.abilityName,
      }))

      const buildOrders = players.map((p: any) => ({
        playerId: p.id,
        sequence: actions
          .filter((a: any) => a.playerId === p.id && ['Train','Build'].includes(a.commandType))
          .map((a: any) => ({ unit: a.abilityName, action: a.commandType, frame: a.frame, time: a.time })),
      }))

      return new Response(
        JSON.stringify({ 
          success: true,
          mapName, 
          durationSeconds, 
          players, 
          buildOrders, 
          actions 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (importError) {
      console.error('screp-js import/parse error:', importError)
      return new Response(JSON.stringify({ 
        error: 'screp-js parsing failed', 
        details: importError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err: any) {
    console.error('General error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

serve(handler)