
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

interface ParserValidationDebugProps {
  enhancedData: EnhancedReplayResult;
}

export function ParserValidationDebug({ enhancedData }: ParserValidationDebugProps) {
  const { dataQuality } = enhancedData;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Enhanced Data Mapper Debug
            <Badge variant={dataQuality.reliability === 'high' ? "default" : "destructive"}>
              {dataQuality.source.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parser Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ✅
              </div>
              <div className="text-sm">BWRemastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dataQuality.source === 'enhanced' ? '✅' : '❌'}
              </div>
              <div className="text-sm">Hex Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dataQuality.reliability === 'high' ? '✅' : '⚠️'}
              </div>
              <div className="text-sm">Data Quality</div>
            </div>
          </div>

          {/* Enhanced Command Extraction Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dataQuality.commandsExtracted}
              </div>
              <div className="text-sm">Commands Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(enhancedData.enhancedBuildOrders).reduce((sum, bo) => sum + bo.length, 0)}
              </div>
              <div className="text-sm">Build Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhancedData.realCommands.length}
              </div>
              <div className="text-sm">Real Commands</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dataQuality.source === 'enhanced' ? '🎯' : '⚠️'}
              </div>
              <div className="text-sm">Enhanced Parser</div>
            </div>
          </div>

          {/* Enhanced Debug Information */}
          {dataQuality.source === 'enhanced' && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">🎯 Enhanced Data Mapper (Active)</h4>
              
              {/* Actions Overview */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-medium mb-2">Command Detection</h5>
                  <div className="space-y-1 text-sm">
                    <div>Real Commands: <Badge variant="outline">{enhancedData.realCommands.length}</Badge></div>
                    <div>Build Orders: <Badge variant="outline">{Object.values(enhancedData.enhancedBuildOrders).reduce((sum, bo) => sum + bo.length, 0)}</Badge></div>
                    <div>Frame Count: <Badge variant="outline">{enhancedData.header.frames}</Badge></div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Parse Quality</h5>
                  <div className="space-y-1 text-sm">
                    <div>Quality: <Badge variant={dataQuality.reliability === 'high' ? 'default' : 'destructive'}>{dataQuality.reliability}</Badge></div>
                    <div>Source: <Badge variant="outline">{dataQuality.source}</Badge></div>
                    <div>Commands: <Badge variant="outline">{dataQuality.commandsExtracted}</Badge></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Build Orders Display */}
              {Object.keys(enhancedData.enhancedBuildOrders).length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium">Enhanced Build Orders</h5>
                  {Object.entries(enhancedData.enhancedBuildOrders).map(([playerId, buildOrder]) => (
                    <Card key={playerId} className="p-3 bg-white dark:bg-gray-900">
                      <div className="flex justify-between items-start mb-2">
                        <h6 className="font-medium">Player {parseInt(playerId) + 1}</h6>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {enhancedData.players[parseInt(playerId)]?.race || 'Unknown'}
                          </Badge>
                          <Badge variant="outline">
                            {buildOrder.length} entries
                          </Badge>
                        </div>
                      </div>
                      
                      {buildOrder.length > 0 && (
                        <div className="text-sm space-y-1">
                          <div className="font-medium text-xs mb-1">First Actions:</div>
                          {buildOrder.slice(0, 5).map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex justify-between text-xs">
                              <span>{entry.time}</span>
                              <span>{entry.action}</span>
                              <span className="text-muted-foreground">{entry.unitName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quality Check Results */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Quality Assessment</h4>
              <div className="space-y-1 text-sm">
                <div>Data Quality: <Badge variant={dataQuality.reliability === 'high' ? 'default' : 'secondary'}>{dataQuality.reliability}</Badge></div>
                <div>Source: <Badge>{dataQuality.source}</Badge></div>
                <div>Commands: <Badge variant="outline">{dataQuality.commandsExtracted}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Extraction Stats</h4>
              <div className="space-y-1 text-sm">
                <div>Real Commands: <Badge variant="outline">{enhancedData.realCommands.length}</Badge></div>
                <div>Build Orders: <Badge variant="outline">{Object.values(enhancedData.enhancedBuildOrders).reduce((sum, bo) => sum + bo.length, 0)}</Badge></div>
                <div>Players: <Badge variant="outline">{enhancedData.players.length}</Badge></div>
              </div>
            </div>
          </div>

          {/* APM Validation */}
          <div>
            <h4 className="font-semibold mb-2">APM Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {enhancedData.players.map((player, index) => (
                <div key={index}>
                  <div className="font-medium">{player.name}</div>
                  <div>APM: {enhancedData.realMetrics[index]?.apm || 0}</div>
                  <div>EAPM: {enhancedData.realMetrics[index]?.eapm || 0}</div>
                  <div>Real Actions: {enhancedData.realMetrics[index]?.realActions || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
