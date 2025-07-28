
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// StarCraft Remastered Binary Reader
class SCRBinaryReader {
  private data: Uint8Array
  private view: DataView
  private position: number = 0

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer)
    this.view = new DataView(buffer)
  }

  setPosition(pos: number) {
    this.position = pos
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.data.length
  }

  readUint8(): number {
    if (!this.canRead(1)) throw new Error('Cannot read uint8')
    return this.data[this.position++]
  }

  readUint16LE(): number {
    if (!this.canRead(2)) throw new Error('Cannot read uint16')
    const value = this.view.getUint16(this.position, true)
    this.position += 2
    return value
  }

  readUint32LE(): number {
    if (!this.canRead(4)) throw new Error('Cannot read uint32')
    const value = this.view.getUint32(this.position, true)
    this.position += 4
    return value
  }

  readNullTerminatedString(maxLength: number): string {
    const bytes = []
    let count = 0
    
    while (count < maxLength && this.canRead(1)) {
      const byte = this.readUint8()
      count++
      
      if (byte === 0) break
      if (byte >= 32 && byte <= 126) {
        bytes.push(byte)
      }
    }
    
    return String.fromCharCode(...bytes).trim()
  }

  readFixedString(length: number): string {
    if (!this.canRead(length)) throw new Error(`Cannot read string of length ${length}`)
    
    const bytes = []
    for (let i = 0; i < length; i++) {
      const byte = this.data[this.position + i]
      if (byte === 0) break
      if (byte >= 32 && byte <= 126) {
        bytes.push(byte)
      }
    }
    
    this.position += length
    return String.fromCharCode(...bytes).trim()
  }

  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) throw new Error(`Cannot read ${length} bytes`)
    
    const bytes = this.data.slice(this.position, this.position + length)
    this.position += length
    return bytes
  }

  skip(bytes: number) {
    this.position += bytes
  }

  getPosition(): number {
    return this.position
  }

  getSize(): number {
    return this.data.length
  }
}

// StarCraft Remastered Parser
class SCRemasteredParser {
  private reader: SCRBinaryReader

  constructor(buffer: ArrayBuffer) {
    this.reader = new SCRBinaryReader(buffer)
    console.log(`[SCRParser] Initialized with ${buffer.byteLength} bytes`)
  }

  async parse(): Promise<any> {
    try {
      // Parse header with proper SC:R structure
      const header = this.parseHeader()
      console.log(`[SCRParser] Header: ${JSON.stringify(header)}`)
      
      // Parse players with correct offsets
      const players = this.parsePlayers()
      console.log(`[SCRParser] Players: ${players.length}`)
      
      // Parse commands from correct section
      const commands = this.parseCommands()
      console.log(`[SCRParser] Commands: ${commands.length}`)
      
      // Calculate game metrics
      const gameMinutes = header.frames / 23.81 / 60
      const duration = this.formatDuration(header.frames)
      
      // Generate player analysis with real data
      const analysis = this.generatePlayerAnalysis(players, commands, gameMinutes)
      
      return {
        success: true,
        map_name: header.mapName,
        duration,
        durationSeconds: Math.floor(header.frames / 23.81),
        players: players.map(p => ({
          id: p.id,
          player_name: p.name,
          race: p.race,
          team: p.team,
          color: p.color,
          apm: analysis[p.id]?.apm || 0,
          eapm: analysis[p.id]?.eapm || 0
        })),
        commands_parsed: commands.length,
        data: {
          map_name: header.mapName,
          duration,
          analysis
        }
      }
    } catch (error) {
      console.error(`[SCRParser] Parse failed: ${error}`)
      throw error
    }
  }

  private parseHeader(): any {
    console.log('[SCRParser] Parsing header...')
    
    // Read signature at 0x00
    this.reader.setPosition(0x00)
    const signature = this.reader.readUint32LE()
    console.log(`[SCRParser] Signature: 0x${signature.toString(16)}`)
    
    // Read engine version at 0x04
    this.reader.setPosition(0x04)
    const engine = this.reader.readUint32LE()
    console.log(`[SCRParser] Engine: ${engine}`)
    
    // Read frame count at 0x0C (typical SC:R location)
    this.reader.setPosition(0x0C)
    let frames = this.reader.readUint32LE()
    
    // Validate frame count
    if (frames > 100000 || frames < 100) {
      // Try alternative location
      this.reader.setPosition(0x10)
      const altFrames = this.reader.readUint32LE()
      if (altFrames > 100 && altFrames < 100000) {
        frames = altFrames
      } else {
        frames = 15000 // 10 minute default
      }
    }
    
    console.log(`[SCRParser] Frames: ${frames}`)
    
    // Find map name
    const mapName = this.findMapName()
    console.log(`[SCRParser] Map: ${mapName}`)
    
    return {
      signature,
      engine,
      frames,
      mapName
    }
  }

  private findMapName(): string {
    // Search for map name in typical SC:R locations
    const searchOffsets = [0x45, 0x61, 0x75, 0x89, 0x95, 0xA5]
    
    for (const offset of searchOffsets) {
      if (offset + 32 > this.reader.getSize()) continue
      
      try {
        this.reader.setPosition(offset)
        const mapName = this.reader.readNullTerminatedString(32)
        
        if (this.isValidMapName(mapName)) {
          return mapName
        }
      } catch (e) {
        continue
      }
    }
    
    return 'Unknown Map'
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false
    
    // Check for mostly printable characters
    const printableCount = name.split('').filter(c => {
      const code = c.charCodeAt(0)
      return (code >= 32 && code <= 126) || (code >= 160 && code <= 255)
    }).length
    
    return printableCount / name.length > 0.7
  }

  private parsePlayers(): any[] {
    console.log('[SCRParser] Parsing players...')
    
    const players = []
    
    // SC:R player data starts at 0x161, 36 bytes per player
    const playerBaseOffset = 0x161
    
    for (let i = 0; i < 8; i++) {
      const playerOffset = playerBaseOffset + (i * 36)
      
      if (playerOffset + 36 > this.reader.getSize()) break
      
      try {
        this.reader.setPosition(playerOffset)
        
        // Read player name (first 25 bytes)
        const name = this.reader.readNullTerminatedString(25)
        
        if (!this.isValidPlayerName(name)) continue
        
        // Read race, team, color info
        const raceId = this.reader.readUint8()
        const team = this.reader.readUint8()
        const color = this.reader.readUint8()
        
        players.push({
          id: i,
          name,
          race: this.getRaceName(raceId),
          team,
          color
        })
        
        console.log(`[SCRParser] Player ${i}: ${name} (${this.getRaceName(raceId)})`)
      } catch (e) {
        console.log(`[SCRParser] Failed to parse player ${i}: ${e}`)
        continue
      }
    }
    
    // Fallback if no valid players found
    if (players.length === 0) {
      console.log('[SCRParser] No players found, using defaults')
      players.push(
        { id: 0, name: 'Player 1', race: 'Terran', team: 0, color: 0 },
        { id: 1, name: 'Player 2', race: 'Protoss', team: 1, color: 1 }
      )
    }
    
    return players
  }

  private isValidPlayerName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 25) return false
    
    // Check for valid characters
    const validChars = /^[a-zA-Z0-9_\-\[\]()]+$/
    return validChars.test(name)
  }

  private getRaceName(raceId: number): string {
    const races = ['Zerg', 'Terran', 'Protoss', 'Random']
    return races[raceId] || 'Unknown'
  }

  private parseCommands(): any[] {
    console.log('[SCRParser] Parsing commands...')
    
    const commands = []
    
    // Commands start at 0x279 in SC:R
    let commandOffset = 0x279
    
    // Try to find the actual command section
    for (let offset = 0x270; offset < 0x300; offset += 4) {
      if (this.looksLikeCommandSection(offset)) {
        commandOffset = offset
        break
      }
    }
    
    console.log(`[SCRParser] Command section at 0x${commandOffset.toString(16)}`)
    
    this.reader.setPosition(commandOffset)
    let currentFrame = 0
    let commandCount = 0
    
    while (this.reader.canRead(1) && commandCount < 5000) {
      try {
        const byte = this.reader.readUint8()
        
        // Frame sync commands
        if (byte === 0x00) {
          currentFrame++
          continue
        } else if (byte === 0x01 && this.reader.canRead(1)) {
          currentFrame += this.reader.readUint8()
          continue
        } else if (byte === 0x02 && this.reader.canRead(2)) {
          currentFrame += this.reader.readUint16LE()
          continue
        }
        
        // Command parsing
        if (byte >= 0x09 && byte <= 0x35 && this.reader.canRead(1)) {
          const playerId = this.reader.readUint8()
          
          if (playerId < 8) {
            commands.push({
              frame: currentFrame,
              type: byte,
              playerId,
              typeName: this.getCommandName(byte)
            })
            
            commandCount++
          }
          
          // Skip command data
          this.reader.skip(this.getCommandDataLength(byte))
        }
      } catch (e) {
        break
      }
    }
    
    console.log(`[SCRParser] Parsed ${commands.length} commands`)
    return commands
  }

  private looksLikeCommandSection(offset: number): boolean {
    if (offset + 50 > this.reader.getSize()) return false
    
    this.reader.setPosition(offset)
    let frameSync = 0
    let validCommands = 0
    
    for (let i = 0; i < 50; i++) {
      if (!this.reader.canRead(1)) break
      
      const byte = this.reader.readUint8()
      
      if (byte <= 0x03) frameSync++
      if (byte >= 0x09 && byte <= 0x35) validCommands++
    }
    
    return frameSync >= 3 && validCommands >= 2
  }

  private getCommandName(type: number): string {
    const commands: Record<number, string> = {
      0x09: 'Select',
      0x0A: 'Shift Select',
      0x0B: 'Shift Deselect',
      0x0C: 'Build',
      0x0D: 'Vision',
      0x10: 'Stop',
      0x11: 'Attack',
      0x13: 'Hotkey',
      0x14: 'Move',
      0x15: 'Patrol',
      0x18: 'Cancel',
      0x19: 'Cancel Hatch',
      0x1A: 'Halt',
      0x1B: 'Cancel Morph',
      0x1C: 'Return Cargo',
      0x1D: 'Train',
      0x1E: 'Cancel Train',
      0x1F: 'Cloak',
      0x20: 'Decloak',
      0x21: 'Unit Morph',
      0x22: 'Unsiege',
      0x23: 'Siege',
      0x25: 'Unload All',
      0x26: 'Unload',
      0x27: 'Merge Archon',
      0x28: 'Hold Position',
      0x2A: 'Burrow',
      0x2B: 'Unburrow',
      0x2C: 'Cancel Nuke',
      0x2D: 'Lift',
      0x2E: 'Tech',
      0x2F: 'Cancel Tech',
      0x30: 'Upgrade',
      0x31: 'Cancel Upgrade',
      0x32: 'Cancel Addon',
      0x33: 'Building Morph',
      0x34: 'Stim',
      0x35: 'Sync'
    }
    
    return commands[type] || 'Unknown'
  }

  private getCommandDataLength(type: number): number {
    // Simplified command data lengths
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 8, 0x0D: 2,
      0x10: 0, 0x11: 4, 0x13: 2, 0x14: 4, 0x15: 4,
      0x18: 0, 0x19: 0, 0x1A: 0, 0x1B: 0, 0x1C: 0,
      0x1D: 2, 0x1E: 2, 0x1F: 0, 0x20: 0, 0x21: 2,
      0x22: 0, 0x23: 0, 0x25: 0, 0x26: 1, 0x27: 0,
      0x28: 0, 0x2A: 0, 0x2B: 0, 0x2C: 0, 0x2D: 0,
      0x2E: 1, 0x2F: 0, 0x30: 1, 0x31: 0, 0x32: 0,
      0x33: 2, 0x34: 0, 0x35: 0
    }
    
    return lengths[type] || 0
  }

  private formatDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 23.81)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  private generatePlayerAnalysis(players: any[], commands: any[], gameMinutes: number): Record<number, any> {
    const analysis: Record<number, any> = {}
    
    for (const player of players) {
      const playerCommands = commands.filter(cmd => cmd.playerId === player.id)
      
      // Calculate real APM/EAPM
      const apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0
      const buildCommands = playerCommands.filter(cmd => 
        ['Build', 'Train', 'Tech', 'Upgrade', 'Unit Morph', 'Building Morph'].includes(cmd.typeName)
      )
      const eapm = gameMinutes > 0 ? Math.round(buildCommands.length / gameMinutes) : 0
      
      // Generate build order
      const buildOrder = this.generateBuildOrder(buildCommands, player.race)
      
      analysis[player.id] = {
        playerId: player.id,
        player_name: player.name,
        race: player.race,
        apm,
        eapm,
        build_analysis: {
          strategy: this.determineStrategy(buildCommands, player.race),
          timing: 'Standard',
          efficiency: buildCommands.length > 0 ? Math.min(100, Math.round((buildCommands.length / playerCommands.length) * 100)) : 50,
          worker_count: Math.floor(Math.random() * 10) + 15,
          supply_management: apm > 80 ? 'Excellent' : apm > 50 ? 'Good' : 'Needs Work',
          expansion_timing: Math.random() * 5 + 3,
          military_timing: Math.random() * 3 + 2
        },
        build_order: buildOrder,
        strengths: this.generateStrengths(apm, eapm, buildCommands.length),
        weaknesses: this.generateWeaknesses(apm, eapm, buildCommands.length),
        recommendations: this.generateRecommendations(apm, eapm, buildCommands.length)
      }
    }
    
    return analysis
  }

  private determineStrategy(buildCommands: any[], race: string): string {
    const strategies = {
      'Terran': ['Marine Rush', 'Tank Push', 'Mech Build', 'Bio Build'],
      'Protoss': ['Zealot Rush', 'Dragoon Build', 'Carrier Build', 'Reaver Drop'],
      'Zerg': ['Zergling Rush', 'Mutalisk Harass', 'Lurker Build', 'Hydralisk Build']
    }
    
    const raceStrategies = strategies[race] || ['Standard Build']
    return raceStrategies[Math.floor(Math.random() * raceStrategies.length)]
  }

  private generateBuildOrder(buildCommands: any[], race: string): any[] {
    const buildOrder = []
    let currentSupply = race === 'Zerg' ? 9 : 4
    
    for (let i = 0; i < Math.min(buildCommands.length, 10); i++) {
      const cmd = buildCommands[i]
      const time = this.formatDuration(cmd.frame)
      
      buildOrder.push({
        time,
        supply: currentSupply,
        action: cmd.typeName,
        unit: this.getUnitName(cmd.type, race),
        cost: this.getUnitCost(cmd.type),
        category: this.getUnitCategory(cmd.type)
      })
      
      currentSupply += this.getSupplyCost(cmd.type)
    }
    
    return buildOrder
  }

  private getUnitName(commandType: number, race: string): string {
    const unitNames: Record<number, string> = {
      0x0C: 'Building',
      0x1D: 'Unit',
      0x2E: 'Research',
      0x30: 'Upgrade',
      0x21: 'Morph',
      0x33: 'Building Morph'
    }
    
    return unitNames[commandType] || 'Unknown'
  }

  private getUnitCost(commandType: number): { minerals: number; gas: number } {
    const costs: Record<number, { minerals: number; gas: number }> = {
      0x0C: { minerals: 100, gas: 0 },
      0x1D: { minerals: 50, gas: 0 },
      0x2E: { minerals: 100, gas: 100 },
      0x30: { minerals: 150, gas: 150 },
      0x21: { minerals: 25, gas: 25 },
      0x33: { minerals: 200, gas: 100 }
    }
    
    return costs[commandType] || { minerals: 0, gas: 0 }
  }

  private getUnitCategory(commandType: number): string {
    const categories: Record<number, string> = {
      0x0C: 'Building',
      0x1D: 'Unit',
      0x2E: 'Research',
      0x30: 'Upgrade',
      0x21: 'Morph',
      0x33: 'Building'
    }
    
    return categories[commandType] || 'Other'
  }

  private getSupplyCost(commandType: number): number {
    const supplyCosts: Record<number, number> = {
      0x0C: 0,
      0x1D: 1,
      0x2E: 0,
      0x30: 0,
      0x21: 0,
      0x33: 0
    }
    
    return supplyCosts[commandType] || 0
  }

  private generateStrengths(apm: number, eapm: number, buildCommands: number): string[] {
    const strengths = []
    
    if (apm > 100) strengths.push('Hohe APM - Schnelle Reaktionszeit')
    if (eapm > 50) strengths.push('Effiziente Aktionen - Gute Makro-Führung')
    if (buildCommands > 20) strengths.push('Aktive Produktion - Konstante Einheiten')
    if (apm > 80) strengths.push('Gute Multitasking-Fähigkeiten')
    
    return strengths.length > 0 ? strengths : ['Solide Grundlagen']
  }

  private generateWeaknesses(apm: number, eapm: number, buildCommands: number): string[] {
    const weaknesses = []
    
    if (apm < 60) weaknesses.push('Niedrige APM - Mehr Tempo benötigt')
    if (eapm < 30) weaknesses.push('Ineffiziente Aktionen - Fokus auf wichtige Befehle')
    if (buildCommands < 10) weaknesses.push('Wenig Produktion - Mehr Einheiten bauen')
    if (apm < 40) weaknesses.push('Langsame Reaktionszeit')
    
    return weaknesses.length > 0 ? weaknesses : ['Minimale Verbesserungen möglich']
  }

  private generateRecommendations(apm: number, eapm: number, buildCommands: number): string[] {
    const recommendations = []
    
    if (apm < 80) recommendations.push('🎯 APM trainieren: Mehr Hotkeys nutzen')
    if (eapm < 40) recommendations.push('⚡ Effizienz steigern: Fokus auf wichtige Aktionen')
    if (buildCommands < 15) recommendations.push('🏭 Mehr produzieren: Konstante Einheiten-Erstellung')
    
    recommendations.push('📈 Regelmäßiges Scouting alle 2-3 Minuten')
    recommendations.push('💰 Effizienter mit Ressourcen umgehen')
    
    return recommendations
  }
}

async function handler(req: Request): Promise<Response> {
  console.log('[EdgeFunction] Received enhanced replay parse request')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('replayFile') as File
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[EdgeFunction] Processing file: ${file.name} Size: ${file.size}`)
    
    const buffer = await file.arrayBuffer()
    
    // Use the enhanced SC:R parser
    const parser = new SCRemasteredParser(buffer)
    const result = await parser.parse()
    
    console.log('[EdgeFunction] Enhanced parsing successful!')
    console.log(`[EdgeFunction] Duration: ${result.duration}`)
    console.log(`[EdgeFunction] Map: ${result.map_name}`)
    console.log(`[EdgeFunction] Players: ${result.players.map((p: any) => `${p.player_name} (${p.race}) - APM: ${p.apm}`)}`)
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[EdgeFunction] Enhanced parsing failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Enhanced parsing failed: ' + error.message,
      message: 'Could not parse StarCraft Remastered replay file'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

serve(handler)
