/**
 * Utility functions for extracting information from replay file bytes
 */

/**
 * Extracts header information from a replay file
 * @param data Uint8Array of the replay file
 */
export function extractReplayHeaderInfo(data: Uint8Array): {
  frameCount?: number;
  mapName?: string;
} {
  const result: { frameCount?: number; mapName?: string } = {};
  
  try {
    // Note: We no longer validate the magic bytes here
    // Just try to extract useful data regardless of file format
    
    // Try to find a map name (rough extraction based on known offset patterns)
    // This is a simplified approach and may not work for all replays
    let mapNameCandidate = '';
    
    // Common offsets where map name can be found
    for (let offset of [0x61, 0x65, 0x69, 0x6D]) {
      let mapBytes = [];
      for (let i = offset; i < offset + 32; i++) {
        if (i >= data.length || data[i] === 0) break;
        mapBytes.push(data[i]);
      }
      
      if (mapBytes.length > 2) {
        const mapName = String.fromCharCode(...mapBytes).trim();
        if (mapName.length > 3 && /^[\x20-\x7E]+$/.test(mapName)) {
          mapNameCandidate = mapName;
          break;
        }
      }
    }
    
    if (mapNameCandidate) {
      result.mapName = mapNameCandidate;
    }
    
    // Try to extract frame count (game duration)
    // Frame count is often stored around offset 0x0C for 4 bytes
    if (data.length > 16) {
      const frameBytes = data.slice(0x0C, 0x10);
      const frameCount = frameBytes[0] + (frameBytes[1] << 8) + (frameBytes[2] << 16) + (frameBytes[3] << 24);
      if (frameCount > 0 && frameCount < 1000000) { // Sanity check
        result.frameCount = frameCount;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting replay header info:', error);
    return result;
  }
}

/**
 * Extracts player information from a replay file
 * @param data Uint8Array of the replay file
 */
export function extractPlayerInfo(data: Uint8Array): {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
} {
  const result = {
    playerName: 'Player',
    opponentName: 'Opponent',
    playerRace: 'T',
    opponentRace: 'P',
  };
  
  try {
    // Look for player names - usually found after the string "OwnerName"
    const ownerBytes = [0x4F, 0x77, 0x6E, 0x65, 0x72, 0x4E, 0x61, 0x6D, 0x65]; // "OwnerName"
    
    let playerNamesStart = -1;
    for (let i = 0; i < data.length - ownerBytes.length; i++) {
      let match = true;
      for (let j = 0; j < ownerBytes.length; j++) {
        if (data[i + j] !== ownerBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        playerNamesStart = i + ownerBytes.length + 2; // Skip "OwnerName" and a few bytes
        break;
      }
    }
    
    if (playerNamesStart > 0) {
      // Extract first player name
      let nameBytes = [];
      for (let i = playerNamesStart; i < playerNamesStart + 32; i++) {
        if (i >= data.length || data[i] === 0) break;
        nameBytes.push(data[i]);
      }
      
      if (nameBytes.length > 0) {
        result.playerName = String.fromCharCode(...nameBytes).trim();
      }
      
      // Try to find second player name after the first
      const nextNameOffset = playerNamesStart + nameBytes.length + 8;
      if (nextNameOffset < data.length) {
        nameBytes = [];
        for (let i = nextNameOffset; i < nextNameOffset + 32; i++) {
          if (i >= data.length || data[i] === 0) break;
          nameBytes.push(data[i]);
        }
        
        if (nameBytes.length > 0) {
          result.opponentName = String.fromCharCode(...nameBytes).trim();
        }
      }
    }
    
    // Look for race information - a simple approach is to look for race letter sequences
    // This is not reliable for all replays but works for many
    // Race markers can be 'T', 'P', 'Z' for Terran, Protoss, Zerg
    const raceMarkers = [
      { race: 'T', bytes: [0x54, 0x65, 0x72, 0x72, 0x61, 0x6E] }, // "Terran"
      { race: 'P', bytes: [0x50, 0x72, 0x6F, 0x74, 0x6F, 0x73, 0x73] }, // "Protoss"
      { race: 'Z', bytes: [0x5A, 0x65, 0x72, 0x67] }, // "Zerg"
    ];
    
    let races = [];
    for (const marker of raceMarkers) {
      for (let i = 0; i < data.length - marker.bytes.length; i++) {
        let match = true;
        for (let j = 0; j < marker.bytes.length; j++) {
          if (data[i + j] !== marker.bytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          races.push({ offset: i, race: marker.race });
        }
      }
    }
    
    // Sort by offset to get races in order
    races.sort((a, b) => a.offset - b.offset);
    
    if (races.length > 0) {
      result.playerRace = races[0].race;
    }
    
    if (races.length > 1) {
      result.opponentRace = races[1].race;
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting player info:', error);
    return result;
  }
}

/**
 * Maps a race letter/abbreviation to the full race name
 */
export function mapRace(race: string): string {
  if (!race) return 'Unknown';
  
  switch (race.toUpperCase()) {
    case 'T':
      return 'Terran';
    case 'P':
      return 'Protoss';
    case 'Z':
      return 'Zerg';
    default:
      return race;
  }
}
