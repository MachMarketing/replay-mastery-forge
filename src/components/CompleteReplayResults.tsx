/**
 * Vollständige Replay-Ergebnisse für CompleteReplayResult
 * Zeigt alle Daten für umfassende AI-Analysen
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompleteReplayResult } from '@/hooks/useReplayParser';
import { 
  Clock, Users, Zap, Target, TrendingUp, Swords, Building, Cpu, Activity, 
  BarChart3, Brain, GamepadIcon 
} from 'lucide-react';

interface CompleteReplayResultsProps {
  data: CompleteReplayResult;
}

const CompleteReplayResults: React.FC<CompleteReplayResultsProps> = ({ data }) => {
  const { header, players, commands, buildOrders, gameplayAnalysis, strategy, dataQuality } = data;
  
  return (
    <div className="space-y-6">
      {/* Game Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {header.mapName}
            <Badge variant="outline" className="ml-auto">
              {header.duration}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieldauer</div>
              <div className="font-bold">{header.duration}</div>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Spieler</div>
              <div className="font-bold">{players.length}</div>
            </div>
            <div className="text-center">
              <Activity className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Commands</div>
              <div className="font-bold">{commands.length}</div>
            </div>
            <div className="text-center">
              <Brain className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">AI Ready</div>
              <div className="font-bold">{dataQuality.aiReadiness ? '✅' : '❌'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players with Complete Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Spieler-Performance (Vollständige Analyse)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {players.map((player, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-lg">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.race} • {player.totalCommands} Commands
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{player.apm} APM</Badge>
                    <Badge variant="secondary">{player.eapm} EAPM</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-blue-600">APM</div>
                    <div className="text-xl font-bold">{player.apm}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">EAPM</div>
                    <div className="text-xl font-bold">{player.eapm}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">Effizienz</div>
                    <div className="text-xl font-bold">{player.efficiency}%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-orange-600">Total</div>
                    <div className="text-xl font-bold">{player.totalCommands}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">Effektiv</div>
                    <div className="text-xl font-bold">{player.effectiveCommands}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Gameplay Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Erweiterte Gameplay-Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {players.map((player, index) => {
              const analysis = gameplayAnalysis[index];
              if (!analysis) return null;
              
              return (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <GamepadIcon className="h-5 w-5" />
                    <h3 className="font-semibold">{player.name}</h3>
                    <Badge variant="outline">{analysis.playstyle}</Badge>
                  </div>
                  
                  {/* APM Breakdown */}
                  <div>
                    <h4 className="font-medium mb-2">APM Breakdown</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-green-600">Economic</div>
                        <div className="font-bold">{analysis.apmBreakdown.economic}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600">Military</div>
                        <div className="font-bold">{analysis.apmBreakdown.military}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600">Micro</div>
                        <div className="font-bold">{analysis.apmBreakdown.micro}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Key Moments */}
                  {analysis.keyMoments && analysis.keyMoments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Schlüsselmomente</h4>
                      <div className="space-y-1 text-sm">
                        {analysis.keyMoments.slice(0, 3).map((moment, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{moment.time}</span>
                            <span className="text-muted-foreground">{moment.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-700 mb-1">Empfehlungen</h4>
                      <ul className="text-sm text-blue-600 list-disc list-inside">
                        {analysis.recommendations.slice(0, 2).map((rec, i) => (
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

      {/* Strategic Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Strategische Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {players.map((player, index) => {
              const playerStrategy = strategy[index];
              if (!playerStrategy) return null;
              
              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{player.name}</h3>
                    <Badge variant="outline">{player.race}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Opening</div>
                      <div>{playerStrategy.openingStrategy}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Economic</div>
                      <div>{playerStrategy.economicApproach}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Military</div>
                      <div>{playerStrategy.militaryFocus}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Tech Path</div>
                      <div>{playerStrategy.techPath}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="font-medium text-muted-foreground">Strategy Efficiency</div>
                    <div className="text-lg font-bold">{playerStrategy.efficiency}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Build Orders */}
      {Object.keys(buildOrders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Intelligente Build Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(buildOrders).map(([playerIdStr, playerBuildOrder]) => {
                const playerId = parseInt(playerIdStr);
                const player = players[playerId];
                
                if (!player || !playerBuildOrder || playerBuildOrder.length === 0) return null;
                
                return (
                  <div key={playerId}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {player.name}
                      <Badge variant="outline">{player.race}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ({playerBuildOrder.length} Actions)
                      </span>
                    </h4>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Zeit</TableHead>
                          <TableHead className="w-20">Supply</TableHead>
                          <TableHead>Aktion</TableHead>
                          <TableHead>Einheit</TableHead>
                          <TableHead>Typ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerBuildOrder.slice(0, 15).map((entry, index) => (
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
                              {entry.unitName}
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

      {/* Command Analysis for AI */}
      {commands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Command-Analyse (Sample für AI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-sm text-muted-foreground">
                Zeigt die ersten 20 Commands für AI-Analyse. Insgesamt: {commands.length} Commands
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Zeit</TableHead>
                  <TableHead className="w-16">Player</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Effektiv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.slice(0, 20).map((command, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {command.timestamp}
                    </TableCell>
                    <TableCell className="text-sm">
                      {players[command.playerId]?.name || `P${command.playerId}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {command.commandType}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {command.parameters?.unitName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={command.effective ? 'default' : 'secondary'} className="text-xs">
                        {command.effective ? 'Ja' : 'Nein'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Data Quality for AI Confidence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI-Analyse Datenqualität</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Quelle</div>
              <div className="font-mono">{dataQuality.source}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Zuverlässigkeit</div>
              <div className="font-mono capitalize">{dataQuality.reliability}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Commands</div>
              <div className="font-mono">{dataQuality.commandsExtracted}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Parsed</div>
              <div className="font-mono">{dataQuality.commandsParsed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Vollständigkeit</div>
              <div className="font-mono">{dataQuality.dataCompleteness}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">AI Ready</div>
              <div className="font-mono">{dataQuality.aiReadiness ? '✅' : '❌'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteReplayResults;