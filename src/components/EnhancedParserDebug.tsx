
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

interface EnhancedParserDebugProps {
  enhancedData: EnhancedReplayResult;
}

export function EnhancedParserDebug({ enhancedData }: EnhancedParserDebugProps) {
  const { dataQuality, gameplayAnalysis, realMetrics } = enhancedData;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Enhanced Parser Debug
            <Badge variant={dataQuality.reliability === 'high' ? "default" : "destructive"}>
              {dataQuality.source.toUpperCase()}
            </Badge>
            {dataQuality.eapmCalculated && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                EAPM ✓
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Enhanced Features Status */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dataQuality.eapmCalculated ? '✅' : '❌'}
              </div>
              <div className="text-sm">EAPM Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dataQuality.commandsExtracted > 200 ? '✅' : '⚠️'}
              </div>
              <div className="text-sm">Command Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dataQuality.effectiveCommands > 0 ? '✅' : '❌'}
              </div>
              <div className="text-sm">Effectiveness</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dataQuality.reliability === 'high' ? '🎯' : '⚠️'}
              </div>
              <div className="text-sm">Data Quality</div>
            </div>
          </div>

          {/* Command Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dataQuality.commandsExtracted}
              </div>
              <div className="text-sm">Commands Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dataQuality.effectiveCommands}
              </div>
              <div className="text-sm">Effective Commands</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dataQuality.commandsExtracted > 0 ? 
                  Math.round((dataQuality.effectiveCommands / dataQuality.commandsExtracted) * 100) : 0}%
              </div>
              <div className="text-sm">Effectiveness Rate</div>
            </div>
          </div>

          {/* EAPM Analysis per Player */}
          {dataQuality.eapmCalculated && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">🎯 EAPM Analysis (Active)</h4>
              
              <div className="space-y-3">
                {enhancedData.players.map((player, index) => {
                  const metrics = realMetrics[index];
                  const analysis = gameplayAnalysis[index];
                  
                  if (!metrics) return null;
                  
                  return (
                    <Card key={index} className="p-3 bg-white dark:bg-gray-900">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h6 className="font-medium">{player.name}</h6>
                          <Badge variant="outline">{player.race}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {metrics.eapm} EAPM
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {metrics.apm} APM
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Efficiency</div>
                          <Progress value={metrics.efficiency} className="h-2 mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {metrics.efficiency}% effective commands
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Command Coverage</div>
                          <Progress 
                            value={analysis?.commandCoverage?.coverage || 0} 
                            className="h-2 mt-1" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {analysis?.commandCoverage?.recognized || 0}/{analysis?.commandCoverage?.total || 0} recognized
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex gap-2 text-xs">
                        <Badge variant={metrics.spamPercentage < 20 ? "default" : "destructive"}>
                          {metrics.spamPercentage}% Spam
                        </Badge>
                        <Badge variant="outline">
                          {metrics.microIntensity} Micro/min
                        </Badge>
                        <Badge variant="outline">
                          {analysis?.playstyle || 'Unknown'} Style
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Build Orders Display */}
          {Object.keys(enhancedData.enhancedBuildOrders).length > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium">Enhanced Build Orders</h5>
              {Object.entries(enhancedData.enhancedBuildOrders).map(([playerId, buildOrder]) => (
                <Card key={playerId} className="p-3 bg-white dark:bg-gray-900">
                  <div className="flex justify-between items-start mb-2">
                    <h6 className="font-medium">
                      {enhancedData.players[parseInt(playerId)]?.name || `Player ${parseInt(playerId) + 1}`}
                    </h6>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {enhancedData.players[parseInt(playerId)]?.race || 'Unknown'}
                      </Badge>
                      <Badge variant="outline">
                        {buildOrder.length} entries
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        All Effective
                      </Badge>
                    </div>
                  </div>
                  
                  {buildOrder.length > 0 && (
                    <div className="text-sm space-y-1">
                      <div className="font-medium text-xs mb-1">Opening Build Order:</div>
                      {buildOrder.slice(0, 8).map((entry, entryIndex) => (
                        <div key={entryIndex} className="flex justify-between text-xs">
                          <span>{entry.time}</span>
                          <span className="font-medium">{entry.action}</span>
                          <span className="text-muted-foreground">{entry.unitName}</span>
                          <span className="text-xs">
                            {entry.cost ? `${entry.cost.minerals}/${entry.cost.gas}` : ''}
                          </span>
                        </div>
                      ))}
                      {buildOrder.length > 8 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {buildOrder.length - 8} more
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Parser Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Enhanced Features</h4>
              <div className="space-y-1 text-sm">
                <div>EAPM Calculation: <Badge variant={dataQuality.eapmCalculated ? 'default' : 'secondary'}>
                  {dataQuality.eapmCalculated ? 'Active' : 'Inactive'}
                </Badge></div>
                <div>Command Types: <Badge variant="outline">77 Types</Badge></div>
                <div>Unit Database: <Badge variant="outline">228 Units</Badge></div>
                <div>Effectiveness: <Badge variant="outline">
                  {dataQuality.commandsExtracted > 0 ? 
                    Math.round((dataQuality.effectiveCommands / dataQuality.commandsExtracted) * 100) : 0}%
                </Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Quality</h4>
              <div className="space-y-1 text-sm">
                <div>Source: <Badge>{dataQuality.source}</Badge></div>
                <div>Reliability: <Badge variant={dataQuality.reliability === 'high' ? 'default' : 'secondary'}>
                  {dataQuality.reliability}
                </Badge></div>
                <div>Commands: <Badge variant="outline">{dataQuality.commandsExtracted}</Badge></div>
                <div>Coverage: <Badge variant="outline">
                  {Object.values(gameplayAnalysis)[0]?.commandCoverage?.coverage || 0}%
                </Badge></div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
