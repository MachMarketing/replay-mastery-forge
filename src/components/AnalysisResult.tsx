
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ParserValidationDebug } from './ParserValidationDebug';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

interface AnalysisResultProps {
  replayData: EnhancedReplayData;
  onReset: () => void;
}

export function AnalysisResult({ replayData, onReset }: AnalysisResultProps) {
  const [showDebug, setShowDebug] = useState(false);
  
  const player1 = replayData.players[0];
  const player2 = replayData.players[1];
  
  // Use enhanced APM data if available
  const player1APM = replayData.enhanced.debugInfo.qualityCheck.apmValidation.chosenAPM[0] || replayData.computed.apm[0] || 0;
  const player2APM = replayData.enhanced.debugInfo.qualityCheck.apmValidation.chosenAPM[1] || replayData.computed.apm[1] || 0;
  
  const buildOrder1 = replayData.computed.buildOrders[0] || [];
  const buildOrder2 = replayData.computed.buildOrders[1] || [];

  const getRaceColor = (race: string) => {
    switch (race?.toLowerCase()) {
      case 'protoss': return 'text-yellow-600';
      case 'terran': return 'text-blue-600';
      case 'zerg': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getAPMColor = (apm: number) => {
    if (apm >= 200) return 'text-red-600';
    if (apm >= 150) return 'text-orange-600';
    if (apm >= 100) return 'text-yellow-600';
    if (apm >= 50) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with Parser Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Replay Analysis</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={replayData.enhanced.hasDetailedActions ? "default" : "secondary"}>
              {replayData.enhanced.extractionMethod.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {replayData.enhanced.debugInfo.actionsExtracted} actions
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </Button>
          </div>
        </div>
        <Button onClick={onReset} variant="outline">
          Analyze Another Replay
        </Button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <ParserValidationDebug enhancedData={replayData} />
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="build-orders">Build Orders</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Game Information */}
          <Card>
            <CardHeader>
              <CardTitle>Game Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Map</p>
                  <p className="text-lg font-semibold">{replayData.header.mapName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-lg font-semibold">{replayData.header.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Matchup</p>
                  <p className="text-lg font-semibold">
                    {player1?.race?.charAt(0) || '?'}v{player2?.race?.charAt(0) || '?'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Parser Quality</p>
                  <p className="text-lg font-semibold">
                    {replayData.enhanced.hasDetailedActions ? '✅ Enhanced' : '⚠️ Basic'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{player1?.name || 'Player 1'}</span>
                  <Badge className={getRaceColor(player1?.race || '')}>
                    {player1?.race || 'Unknown'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(player1APM)}>{player1APM}</span>
                    </p>
                    <p className="text-sm text-gray-500">APM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(replayData.computed.eapm[0] || 0)}>
                        {replayData.computed.eapm[0] || 0}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">EAPM</p>
                  </div>
                </div>
                
                {buildOrder1.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Order Preview</p>
                    <div className="space-y-1">
                      {buildOrder1.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-500">{item.timestamp}</span> - {item.action}
                        </div>
                      ))}
                      {buildOrder1.length > 3 && (
                        <p className="text-xs text-gray-400">+{buildOrder1.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{player2?.name || 'Player 2'}</span>
                  <Badge className={getRaceColor(player2?.race || '')}>
                    {player2?.race || 'Unknown'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(player2APM)}>{player2APM}</span>
                    </p>
                    <p className="text-sm text-gray-500">APM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-1">
                      <span className={getAPMColor(replayData.computed.eapm[1] || 0)}>
                        {replayData.computed.eapm[1] || 0}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">EAPM</p>
                  </div>
                </div>
                
                {buildOrder2.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Build Order Preview</p>
                    <div className="space-y-1">
                      {buildOrder2.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-500">{item.timestamp}</span> - {item.action}
                        </div>
                      ))}
                      {buildOrder2.length > 3 && (
                        <p className="text-xs text-gray-400">+{buildOrder2.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="build-orders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Build Order */}
            <Card>
              <CardHeader>
                <CardTitle>{player1?.name || 'Player 1'} Build Order</CardTitle>
              </CardHeader>
              <CardContent>
                {buildOrder1.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {buildOrder1.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-gray-50">
                        <span className="text-sm">{item.action}</span>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{item.timestamp}</div>
                          {item.supply && (
                            <div className="text-xs text-gray-400">{item.supply} supply</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No build order data available</p>
                )}
              </CardContent>
            </Card>

            {/* Player 2 Build Order */}
            <Card>
              <CardHeader>
                <CardTitle>{player2?.name || 'Player 2'} Build Order</CardTitle>
              </CardHeader>
              <CardContent>
                {buildOrder2.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {buildOrder2.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-gray-50">
                        <span className="text-sm">{item.action}</span>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{item.timestamp}</div>
                          {item.supply && (
                            <div className="text-xs text-gray-400">{item.supply} supply</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No build order data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* APM Analysis */}
              <div>
                <h4 className="font-semibold mb-3">APM Comparison</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{player1?.name || 'Player 1'}</span>
                      <span className="text-sm text-gray-500">{player1APM} APM</span>
                    </div>
                    <Progress value={Math.min((player1APM / 300) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{player2?.name || 'Player 2'}</span>
                      <span className="text-sm text-gray-500">{player2APM} APM</span>
                    </div>
                    <Progress value={Math.min((player2APM / 300) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Data Quality */}
              <div>
                <h4 className="font-semibold mb-3">Data Quality</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {replayData.enhanced.debugInfo.actionsExtracted}
                    </div>
                    <div className="text-sm text-gray-500">Actions Extracted</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {replayData.enhanced.debugInfo.buildOrdersGenerated}
                    </div>
                    <div className="text-sm text-gray-500">Build Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {replayData.enhanced.extractionTime}ms
                    </div>
                    <div className="text-sm text-gray-500">Parse Time</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Replay Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded overflow-auto max-h-96 border">
                {JSON.stringify(replayData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
