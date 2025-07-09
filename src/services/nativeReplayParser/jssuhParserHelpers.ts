/**
 * Helper methods for JssuhParser
 */

export class JssuhParserHelpers {
  static extractPlayersData(replayData: any): any[] {
    const playersData = replayData?.players || [];
    
    return playersData
      .filter((player: any) => {
        // Filter nur echte Spieler (haben Namen und sind nicht Observer)
        return player && player.name && player.name.trim() !== '' && player.type === 2; // type 2 = human player
      })
      .slice(0, 8) // Max 8 Spieler in SC
      .map((player: any) => {
        return {
          name: player.name || `Player ${player.ID + 1}`,
          race: player.race || 'Unknown',
          team: player.team || player.ID + 1,
          color: player.ID,
          apm: player.apm || 0,
          eapm: player.eapm || 0,
          efficiency: player.apm > 0 ? Math.round((player.eapm / player.apm) * 100) : 0
        };
      });
  }

  static mapCommandType(typeName: string): string {
    const commandMap: Record<string, string> = {
      'Select': 'Select',
      'Train': 'Train',
      'Build': 'Build',
      'Research': 'Research',
      'Upgrade': 'Upgrade',
      'Move': 'Move',
      'Attack': 'Attack',
      'Stop': 'Stop',
      'Hold': 'Hold Position',
      'Patrol': 'Patrol'
    };
    
    return commandMap[typeName] || 'Unknown';
  }
}