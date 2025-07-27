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

    // Try Go service first, fallback to screp-js if it fails
    try {
      console.log('Attempting Go service for parsing...')
      
      // Create FormData for the Go service
      const formData = new FormData()
      formData.append('replay', file)
      
      // Call our Go service with timeout
      const goServiceUrl = 'https://screp-go-service-production.up.railway.app/parse'
      console.log('Calling Go service at:', goServiceUrl)
      
      const response = await fetch(goServiceUrl, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`Go service responded with status: ${response.status}`)
      }
      
      const goResult = await response.json()
      console.log('Go service success:', goResult)
      
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
    } catch (goServiceError) {
      console.error('Go service failed, trying screp-js fallback:', goServiceError)
      
      // Fallback to screp-js
      console.log('Trying screp-js fallback...')
      const screpModule = await import('https://esm.sh/screp-js@0.3.0')
      console.log('screp-js loaded for fallback')
      
      const buffer = new Uint8Array(await file.arrayBuffer())
      const { parseBuffer } = screpModule
      
      if (!parseBuffer) {
        throw new Error('parseBuffer function not found in screp-js')
      }
      
      const replay = parseBuffer(buffer)
      console.log('screp-js fallback parsing completed')
      
      // Basic mapping for screp-js result
      const players = [{
        name: 'Player 1',
        race: 'Unknown',
        apm: 0
      }]

      const buildOrder = []
      const analysis = {
        strengths: ['Replay loaded with fallback parser'],
        weaknesses: ['Limited data available'],
        recommendations: ['Try uploading again later']
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          mapName: 'Parsed with fallback',
          duration: '0:00',
          players,
          buildOrder,
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
}

serve(handler)