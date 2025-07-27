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

    // Use our Go service for reliable parsing
    try {
      console.log('Using Go screp service for parsing...')
      
      // Create FormData for the Go service
      const formData = new FormData()
      formData.append('replay', file)
      
      // Call our Go service
      const goServiceUrl = 'https://screp-go-service-production.up.railway.app/parse'
      console.log('Calling Go service at:', goServiceUrl)
      
      const response = await fetch(goServiceUrl, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Go service responded with status: ${response.status}`)
      }
      
      const goResult = await response.json()
      console.log('Go service response:', goResult)
      
      // Map Go service result to frontend format
      const players = (goResult.players || []).map((p: any) => ({
        name: p.name || 'Unknown',
        race: p.race || 'Unknown',
        apm: p.apm || 0
      }))

      const buildOrder = (goResult.buildOrders || [])
        .flatMap((bo: any) => bo.sequence || [])
        .map((cmd: any) => ({
          time: `${Math.floor(cmd.time / 60)}:${String(Math.floor(cmd.time % 60)).padStart(2, '0')}`,
          action: cmd.commandType || 'Build',
          unit: cmd.abilityName || 'Unknown'
        }))

      const analysis = {
        strengths: ['Replay successfully parsed with Go service'],
        weaknesses: [],
        recommendations: ['Continue analyzing your gameplay']
      }

      console.log('Mapped data:', { 
        players: players.length, 
        buildOrder: buildOrder.length,
        mapName: goResult.mapName 
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          mapName: goResult.mapName || 'Unknown Map',
          duration: `${Math.floor(goResult.durationSeconds / 60)}:${String(Math.floor(goResult.durationSeconds % 60)).padStart(2, '0')}`,
          players,
          buildOrder,
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (serviceError) {
      console.error('Go service error:', serviceError)
      return new Response(JSON.stringify({ 
        error: 'Go service parsing failed', 
        details: serviceError.message 
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