
/**
 * Enhanced results display with data cleaning for SC:R replays
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RemasteredReplayData } from '@/services/replayParser/scRemasteredParser';
import { Clock, Users, Zap, Target, TrendingUp } from 'lucide-react';

interface ReplayResultsProps {
  data: RemasteredReplayData;
}

const ReplayResults: React.FC<ReplayResultsProps> = ({ data }) => {
  // Clean player names and filter valid players
  const validPlayers = data.players.filter(player => {
    const cleanName = cleanPlayerName(player.name);
    return cleanName.length >= 2 && cleanName.length <= 12 && /^[a-zA-Z0-9_\-\[\]]+$/.test(cleanName);
  }).map(player => ({
    ...player,
    name: cleanPlayerName(player.name),
    race: player.race === 'Unknown' ? guessRaceFromBuildOrder(player.id, data.buildOrders) : player.race
  }));

  // Filter realistic build orders
  const cleanBuildOrders = data.buildOrders.filter(bo => {
    const validPlayer = validPlayers.find(p => p.id === bo.playerId);
    return validPlayer && bo.entries.length > 0 && bo.entries.length < 50;
  }).map(bo => ({
    ...bo,
    entries: bo.entries.filter(entry => {
      const timeInSeconds = parseTimeToSeconds(entry.time);
      return timeInSeconds >= 0 && timeInSeconds < 3600; // Max 1 hour
    }).slice(0, 15) // Limit to first 15 entries
  }));

  function cleanPlayerName(name: string): string {
    return name.replace(/[^\w\-\[\]]/g, '').trim().substring(0, 12);
  }

  function guessRaceFromBuildOrder(playerId: number, buildOrders: any[]): string {
    const playerBO = buildOrders.find(bo => bo.playerId === playerId);
    if (!playerBO) return 'Unknown';
    
    const actions = playerBO.entries.map(e => e.action.toLowerCase()).join(' ');
    if (actions.includes('probe') || actions.includes('zealot') || actions.includes('pylon')) return 'Protoss';
    if (actions.includes('scv') || actions.includes('marine') || actions.includes('depot')) return 'Terran';
    if (actions.includes('drone') || actions.includes('zergling') || actions.includes('hatchery')) return 'Zerg';
    return 'Unknown';
  }

  function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      {/* Game Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {data.header.mapName || 'Unbekannte Map'}
            <Badge variant="outline" className="ml-auto">
              {data.header.duration}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Dauer</div>
              <div className="font-bold">{formatDuration(Math.floor(data.header.frames / 23.81))}</div>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieler</div>
              <div className="font-bold">{validPlayers.length}</div>
            </div>
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Kommandos</div>
              <div className="font-bold">{data.rawData.totalCommands}</div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Engine</div>
              <div className="font-bold">{data.header.engine}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Overview */}
      {validPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spieler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.race} • Team {player.team}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{player.apm}</div>
                    <div className="text-xs text-muted-foreground">APM</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Build Orders */}
      {cleanBuildOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Build Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {cleanBuildOrders.map((buildOrder) => {
                const player = validPlayers.find(p => p.id === buildOrder.playerId);
                if (!player) return null;
                
                return (
                  <div key={buildOrder.playerId}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {player.name}
                      <Badge variant="outline">{player.race}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ({buildOrder.entries.length} Aktionen)
                      </span>
                    </h4>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Zeit</TableHead>
                          <TableHead className="w-20">Supply</TableHead>
                          <TableHead>Aktion</TableHead>
                          <TableHead>Einheit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildOrder.entries.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">
                              {entry.time}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.supply}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.action}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.unitName || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Frames</div>
              <div className="font-mono">{data.header.frames.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Spielzeit</div>
              <div className="font-mono">{data.rawData.gameMinutes.toFixed(1)} min</div>
            </div>
            <div>
              <div className="text-muted-foreground">Parser</div>
              <div className="font-mono">{data.rawData.extractionMethod}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Build Orders</div>
              <div className="font-mono">{cleanBuildOrders.length} gefiltert</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplayResults;
