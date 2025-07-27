import { serve } from 'https://deno.land/std@0.181.0/http/server.ts'
import { parseReplay } from 'https://esm.sh/screp-js@0.3.0'

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
    const formData = await req.formData()
    const file = formData.get('replayFile') as File
    if (!file) {
      return new Response(JSON.stringify({ error: 'No replay file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const buffer = new Uint8Array(await file.arrayBuffer())
    const replay = parseReplay(buffer)

    const mapName = replay.header.mapName || 'Unknown'
    const durationSeconds = replay.header.replayLength || 0

    const players = (replay.header.players || []).map(p => ({
      id:    p.playerId, name: p.name, race: p.race, apm: p.apm, eapm: p.eapm,
    }))

    const actions = (replay.commands || []).map(c => ({
      playerId:    c.playerId,
      frame:       c.frame,
      time:        +(c.frame / 16).toFixed(2),
      commandType: c.commandType,
      abilityName: c.abilityName,
    }))

    const buildOrders = players.map(p => ({
      playerId: p.id,
      sequence: actions
        .filter(a => a.playerId === p.id && ['Train','Build'].includes(a.commandType))
        .map(a => ({ unit: a.abilityName, action: a.commandType, frame: a.frame, time: a.time })),
    }))

    return new Response(
      JSON.stringify({ mapName, durationSeconds, players, buildOrders, actions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Parser error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

serve(handler)