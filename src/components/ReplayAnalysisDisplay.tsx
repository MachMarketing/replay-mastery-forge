
import React from 'react';
import { FinalReplayResult } from '@/services/nativeReplayParser/screpJsParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Map, Target, TrendingUp, Zap } from 'lucide-react';

interface ReplayAnalysisDisplayProps {
  replayData: FinalReplayResult;
}

export const ReplayAnalysisDisplay: React.FC<ReplayAnalysisDisplayProps> = ({ replayData }) => {
  const { header, players, gameplayAnalysis, buildOrders, dataQuality } = replayData;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Spiel-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Spiel-Übersicht
            <Badge variant={dataQuality.reliability === 'high' ? 'default' : 'secondary'}>
              {dataQuality.source} - {dataQuality.reliability}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{header.mapName}</div>
              <div className="text-sm text-muted-foreground">Karte</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{header.duration}</div>
              <div className="text-sm text-muted-foreground">Spieldauer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{header.gameType}</div>
              <div className="text-sm text-muted-foreground">Spieltyp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                ✅ {dataQuality.apmCalculated && dataQuality.eapmCalculated ? 'EAPM' : 'Basis'}
              </div>
              <div className="text-sm text-muted-foreground">Analyse</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spieler-Vergleich */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Spieler-Vergleich
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {players.map((player, index) => {
              const analysis = gameplayAnalysis[index];
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.race} • Team {player.team}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{player.eapm} EAPM</div>
                      <div className="text-sm text-muted-foreground">{player.apm} APM</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Effizienz</span>
                        <span className={player.efficiency > 70 ? 'text-green-500' : player.efficiency > 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {player.efficiency}%
                        </span>
                      </div>
                      <Progress value={player.efficiency} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Spam Rate</span>
                        <span className={100 - player.efficiency < 30 ? 'text-green-500' : 100 - player.efficiency < 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {100 - player.efficiency}%
                        </span>
                      </div>
                      <Progress value={100 - player.efficiency} className="h-2" />
                    </div>
                  </div>

                  {analysis && (
                    <div className="space-y-3">
                      <div>
                        <Badge variant="outline">{analysis.playstyle}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-green-600 mb-2">Stärken:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.strengths.map((strength: string, i: number) => (
                              <li key={i}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium text-orange-600 mb-2">Verbesserungen:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.recommendations.slice(0, 3).map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Build Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Build Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {players.map((player, index) => {
              const playerBuildOrder = buildOrders[index] || [];
              return (
                <div key={index} className="space-y-3">
                  <h3 className="font-bold">{player.name} ({player.race})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {playerBuildOrder.slice(0, 15).map((order, orderIndex) => (
                      <div key={orderIndex} className="flex justify-between items-center text-sm border-b pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{order.time}</span>
                          <span>{order.action}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {order.category}
                          </Badge>
                          <span className="text-muted-foreground">{order.supply}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {playerBuildOrder.length === 0 && (
                    <div className="text-muted-foreground text-sm">
                      Keine Build Order Daten gefunden
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leistungsmetriken */}
      <div className="grid md:grid-cols-3 gap-4">
        {players.map((player, index) => {
          const analysis = gameplayAnalysis[index];
          if (!analysis) return null;

          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{player.name} - Leistungsmetriken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">APM</span>
                    </div>
                    <span className="font-bold">{player.apm}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">EAPM</span>
                    </div>
                    <span className="font-bold text-green-600">{player.eapm}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Effizienz</span>
                    </div>
                    <span className="font-bold">{player.efficiency}%</span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Effektive: {analysis.apmBreakdown.effective}</div>
                    <div>Spam: {analysis.apmBreakdown.spam}</div>
                    <div>Micro: {analysis.apmBreakdown.micro}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Datenqualität */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse-Qualität</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Parser</div>
              <div className="text-muted-foreground">{dataQuality.source}</div>
            </div>
            <div>
              <div className="font-medium">Qualität</div>
              <div className="text-muted-foreground">{dataQuality.reliability}</div>
            </div>
            <div>
              <div className="font-medium">Commands</div>
              <div className="text-muted-foreground">{dataQuality.commandsFound}</div>
            </div>
            <div>
              <div className="font-medium">Spieler</div>
              <div className="text-muted-foreground">{dataQuality.playersFound}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
