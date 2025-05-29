
/**
 * Enhanced results display for SC:R replays using EnhancedReplayResult
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import { Clock, Users, Zap, Target, TrendingUp, Swords, Building, Cpu, Activity } from 'lucide-react';

interface ReplayResultsProps {
  data: EnhancedReplayResult;
}

const ReplayResults: React.FC<ReplayResultsProps> = ({ data }) => {
  // Ensure players array exists and is valid
  const validPlayers = (data.players || []).filter(player => {
    return player && player.name && player.name.trim().length > 0;
  });

  // Calculate real action counts from APM and game duration
  const gameMinutes = data.header?.frames ? (data.header.frames / 23.81 / 60) : 0;
  
  // Get real commands for display
  const realCommands = data.realCommands || [];
  const commandsByPlayer = validPlayers.map(player => {
    const playerIndex = validPlayers.findIndex(p => p.name === player.name);
    const playerCommands = realCommands.filter(cmd => cmd.playerId === playerIndex);
    return {
      playerId: playerIndex,
      player,
      commands: playerCommands.slice(0, 30) // Show first 30 commands
    };
  });

  function formatDuration(frames: number): string {
    const seconds = Math.floor(frames / 23.81);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getPlayerAPM(playerIndex: number): number {
    return data.realMetrics?.[playerIndex]?.apm || 0;
  }

  function getPlayerEAPM(playerIndex: number): number {
    return data.realMetrics?.[playerIndex]?.eapm || 0;
  }

  function getPlayerRealActions(playerIndex: number): number {
    return data.realMetrics?.[playerIndex]?.realActions || 0;
  }

  function calculateActionsFromAPM(apm: number): number {
    return Math.round(apm * gameMinutes);
  }

  function formatTime(frame: number): string {
    const seconds = Math.floor(frame / 23.81);
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
            {data.header?.mapName || 'Unbekannte Map'}
            <Badge variant="outline" className="ml-auto">
              {data.header?.duration || 'Unbekannte Dauer'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieldauer</div>
              <div className="font-bold">{data.header?.duration || formatDuration(data.header?.frames || 0)}</div>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieler</div>
              <div className="font-bold">{validPlayers.length}</div>
            </div>
            <div className="text-center">
              <Activity className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Gesamtaktionen</div>
              <div className="font-bold">
                {validPlayers.reduce((total, _, index) => total + getPlayerRealActions(index), 0).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Datenqualität</div>
              <div className="font-bold capitalize">{data.dataQuality?.reliability || 'Unknown'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Detailed Stats */}
      {validPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Spieler Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {validPlayers.map((player, index) => {
                const apm = getPlayerAPM(index);
                const eapm = getPlayerEAPM(index);
                const realActions = getPlayerRealActions(index);
                const calculatedActions = calculateActionsFromAPM(apm);

                return (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.race} • Team {player.team || index + 1}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {apm} APM
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-blue-600">APM</div>
                        <div className="text-xl font-bold">{apm}</div>
                        <div className="text-xs text-muted-foreground">Aktionen/Min</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">EAPM</div>
                        <div className="text-xl font-bold">{eapm}</div>
                        <div className="text-xs text-muted-foreground">Effektiv/Min</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-purple-600">Gesamtaktionen</div>
                        <div className="text-xl font-bold">{realActions > 0 ? realActions.toLocaleString() : calculatedActions.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {realActions > 0 ? 'Extrahiert' : 'Berechnet'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-orange-600">Effizienz</div>
                        <div className="text-xl font-bold">{apm > 0 ? Math.round((eapm / apm) * 100) : 0}%</div>
                        <div className="text-xs text-muted-foreground">EAPM/APM</div>
                      </div>
                    </div>

                    {/* Action Breakdown */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        <strong>Aktions-Breakdown:</strong> {apm} APM × {gameMinutes.toFixed(1)} Min = ~{calculatedActions} Aktionen
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real Commands Section - only if we have extracted commands */}
      {commandsByPlayer.length > 0 && commandsByPlayer.some(p => p.commands.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Extrahierte Aktionen (Live-Daten)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {commandsByPlayer.filter(p => p.commands.length > 0).map((playerData) => (
                <div key={playerData.playerId}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {playerData.player.name}
                    <Badge variant="outline">{playerData.player.race}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({playerData.commands.length} von {getPlayerRealActions(playerData.playerId)} Aktionen)
                    </span>
                  </h4>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Zeit</TableHead>
                        <TableHead>Aktion</TableHead>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Typ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playerData.commands.map((command, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {formatTime(command.frame)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {command.commandName || `CMD_${command.commandId}`}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {command.parameters ? (
                              <div className="space-y-1">
                                {Object.entries(command.parameters).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="secondary" className="text-xs">
                              ID: {command.commandId}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Build Orders */}
      {data.enhancedBuildOrders && Object.keys(data.enhancedBuildOrders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Build Orders (Intelligente Rekonstruktion)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(data.enhancedBuildOrders).map(([playerIdStr, buildOrder]) => {
                const playerId = parseInt(playerIdStr);
                const player = validPlayers[playerId];
                
                if (!player || !buildOrder || buildOrder.length === 0) return null;
                
                return (
                  <div key={playerId}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {player.name}
                      <Badge variant="outline">{player.race}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ({buildOrder.length} Build-Aktionen)
                      </span>
                    </h4>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Zeit</TableHead>
                          <TableHead className="w-20">Supply</TableHead>
                          <TableHead>Aktion</TableHead>
                          <TableHead>Einheit</TableHead>
                          <TableHead>Kategorie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildOrder.slice(0, 20).map((entry: any, index: number) => (
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
                            <TableCell className="text-sm">
                              <Badge variant="secondary" className="text-xs">
                                {entry.category}
                              </Badge>
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

      {/* Enhanced Analysis */}
      {data.gameplayAnalysis && Object.keys(data.gameplayAnalysis).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {validPlayers.map((player, index) => {
                const analysis = data.gameplayAnalysis[index];
                const metrics = data.realMetrics?.[index];
                
                if (!analysis) return null;
                
                return (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{player.name}</h3>
                      <Badge variant="outline">{player.race}</Badge>
                      <Badge variant="secondary">{analysis.playstyle}</Badge>
                    </div>
                    
                    {analysis.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-700 mb-1">Stärken</h4>
                        <ul className="text-sm text-green-600 list-disc list-inside">
                          {analysis.strengths.map((strength: string, i: number) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.weaknesses?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-700 mb-1">Schwächen</h4>
                        <ul className="text-sm text-red-600 list-disc list-inside">
                          {analysis.weaknesses.map((weakness: string, i: number) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-1">Empfehlungen</h4>
                        <ul className="text-sm text-blue-600 list-disc list-inside">
                          {analysis.recommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
              <div className="font-mono">{(data.header?.frames || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Spielminuten</div>
              <div className="font-mono">{gameMinutes.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Datenquelle</div>
              <div className="font-mono">{data.dataQuality?.source || 'unknown'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Extrahierte Commands</div>
              <div className="font-mono">{realCommands.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplayResults;
