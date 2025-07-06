/**
 * screp-core Replay Results - zeigt NewFinalReplayResult data
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';
import { 
  Clock, Users, Zap, Target, TrendingUp, Building, Cpu, Activity, 
  BarChart3, Brain, GamepadIcon 
} from 'lucide-react';

interface CompleteReplayResultsProps {
  data: NewFinalReplayResult;
}

const CompleteReplayResults: React.FC<CompleteReplayResultsProps> = ({ data }) => {
  const { header, players, buildOrders, gameplayAnalysis, dataQuality } = data;
  
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
              <div className="font-bold">{dataQuality.commandsFound}</div>
            </div>
            <div className="text-center">
              <Brain className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Qualität</div>
              <div className="font-bold">{dataQuality.reliability}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players with screp-core Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Spieler-Performance (screp-core)
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
                      {player.race} • {player.efficiency}% Effizienz
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{player.apm} APM</Badge>
                    <Badge variant="secondary">{player.eapm} EAPM</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                    <div className="font-medium text-orange-600">Team</div>
                    <div className="text-xl font-bold">{player.team}</div>
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
            Gameplay-Analyse (screp-core)
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
                        <div className="font-bold">{analysis.apmBreakdown?.economic || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600">Micro</div>
                        <div className="font-bold">{analysis.apmBreakdown?.micro || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600">Effective</div>
                        <div className="font-bold">{analysis.apmBreakdown?.effective || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Micro Events */}
                  {analysis.microEvents && analysis.microEvents.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Micro Events</h4>
                      <div className="space-y-1 text-sm">
                        {analysis.microEvents.slice(0, 3).map((event, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{event.time}</span>
                            <span className="text-muted-foreground">{event.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h4 className="font-medium text-green-700 mb-1">Stärken</h4>
                      <ul className="text-sm text-green-600 list-disc list-inside">
                        {analysis.strengths?.slice(0, 2).map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-700 mb-1">Schwächen</h4>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {analysis.weaknesses?.slice(0, 2).map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
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

      {/* Build Orders - DER WICHTIGSTE TEIL */}
      {Object.keys(buildOrders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              🚀 screp-core Build Orders (ECHTE DATEN!)
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
                        ({playerBuildOrder.length} Build Actions)
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
                        {playerBuildOrder.slice(0, 20).map((entry, index) => (
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
                              {entry.unitName || 'Unknown'}
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

      {/* Data Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">screp-core Datenqualität</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Parser</div>
              <div className="font-mono">{dataQuality.source}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Qualität</div>
              <div className="font-mono capitalize">{dataQuality.reliability}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Commands</div>
              <div className="font-mono">{dataQuality.commandsFound}</div>
            </div>
            <div>
              <div className="text-muted-foreground">APM berechnet</div>
              <div className="font-mono">{dataQuality.apmCalculated ? '✅' : '❌'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">EAPM berechnet</div>
              <div className="font-mono">{dataQuality.eapmCalculated ? '✅' : '❌'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteReplayResults;