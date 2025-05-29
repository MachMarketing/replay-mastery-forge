
/**
 * Enhanced results display for SC:R replays using EnhancedReplayResult
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import { Clock, Users, Zap, Target, TrendingUp, Swords, Building, Cpu } from 'lucide-react';

interface ReplayResultsProps {
  data: EnhancedReplayResult;
}

const ReplayResults: React.FC<ReplayResultsProps> = ({ data }) => {
  // Ensure players array exists and is valid
  const validPlayers = (data.players || []).filter(player => {
    return player && player.name && player.name.trim().length > 0;
  });

  // Ensure enhanced build orders exist
  const enhancedBuildOrders = data.enhancedBuildOrders || {};
  
  // Get build orders for valid players
  const playerBuildOrders = validPlayers.map(player => {
    const playerIndex = validPlayers.findIndex(p => p.name === player.name);
    const buildOrder = enhancedBuildOrders[playerIndex] || [];
    return {
      playerId: playerIndex,
      player,
      entries: buildOrder.slice(0, 20) // Show more entries
    };
  }).filter(bo => bo.entries.length > 0);

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
  }).filter(pc => pc.commands.length > 0);

  function formatDuration(frames: number): string {
    const seconds = Math.floor(frames / 23.81);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getPlayerMetric(playerIndex: number, metric: string): number {
    const playerMetrics = data.realMetrics?.[playerIndex];
    return playerMetrics?.[metric] || 0;
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
              <div className="text-sm text-muted-foreground">Dauer</div>
              <div className="font-bold">{data.header?.duration || formatDuration(data.header?.frames || 0)}</div>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieler</div>
              <div className="font-bold">{validPlayers.length}</div>
            </div>
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Echte Kommandos</div>
              <div className="font-bold">{realCommands.length}</div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Datenqualität</div>
              <div className="font-bold capitalize">{data.dataQuality?.reliability || 'Unknown'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Overview */}
      {validPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spieler Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validPlayers.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.race} • Team {player.team || index + 1}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{getPlayerMetric(index, 'apm')}</div>
                    <div className="text-xs text-muted-foreground">APM</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real Commands - DAS SIND DIE ECHTEN AKTIONSDATEN! */}
      {commandsByPlayer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Echte Spieler-Aktionen (Hex-extrahiert)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {commandsByPlayer.map((playerData) => (
                <div key={playerData.playerId}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    {playerData.player.name} - Echte Kommandos
                    <Badge variant="outline">{playerData.player.race}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({playerData.commands.length} Aktionen gezeigt)
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
      {playerBuildOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Intelligente Build Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {playerBuildOrders.map((buildOrder) => (
                <div key={buildOrder.playerId}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    {buildOrder.player.name}
                    <Badge variant="outline">{buildOrder.player.race}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({buildOrder.entries.length} Build-Aktionen)
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Analysis */}
      {data.gameplayAnalysis && Object.keys(data.gameplayAnalysis).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Gameplay Analyse</CardTitle>
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
                    
                    {metrics && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Echte APM</div>
                          <div className="text-lg font-bold text-blue-600">{metrics.apm}</div>
                        </div>
                        <div>
                          <div className="font-medium">Echte EAPM</div>
                          <div className="text-lg font-bold text-green-600">{metrics.eapm}</div>
                        </div>
                        <div>
                          <div className="font-medium">Micro-Intensität</div>
                          <div className="text-lg font-bold text-purple-600">{metrics.microIntensity}</div>
                        </div>
                        <div>
                          <div className="font-medium">Echte Aktionen</div>
                          <div className="text-lg font-bold text-orange-600">{metrics.realActions}</div>
                        </div>
                      </div>
                    )}
                    
                    {analysis.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-700 mb-1">Stärken</h4>
                        <ul className="text-sm text-green-600 list-disc list-inside">
                          {analysis.strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.weaknesses?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-700 mb-1">Schwächen</h4>
                        <ul className="text-sm text-red-600 list-disc list-inside">
                          {analysis.weaknesses.map((weakness, i) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-1">Empfehlungen</h4>
                        <ul className="text-sm text-blue-600 list-disc list-inside">
                          {analysis.recommendations.map((rec, i) => (
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

      {/* Enhanced Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Enhanced Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Frames</div>
              <div className="font-mono">{(data.header?.frames || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Datenquelle</div>
              <div className="font-mono">{data.dataQuality?.source || 'unknown'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Parser</div>
              <div className="font-mono">Enhanced Data Mapper</div>
            </div>
            <div>
              <div className="text-muted-foreground">Hex Commands</div>
              <div className="font-mono">{realCommands.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplayResults;
