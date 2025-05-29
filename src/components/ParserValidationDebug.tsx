
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

interface ParserValidationDebugProps {
  enhancedData: EnhancedReplayData;
}

export function ParserValidationDebug({ enhancedData }: ParserValidationDebugProps) {
  const { enhanced } = enhancedData;
  const { debugInfo } = enhanced;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Enhanced Remastered Parser Debug
            <Badge variant={enhanced.hasDetailedActions ? "default" : "destructive"}>
              {debugInfo.qualityCheck.activeParser.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parser Status - Updated for Remastered parsers */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {debugInfo.screpJsSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">screp-js</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {debugInfo.directParserSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">Direct Parser</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {debugInfo.remasteredParserSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">BW Remastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {debugInfo.remasteredActionParserSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">Remastered Actions</div>
            </div>
          </div>

          {/* Enhanced Command Extraction Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {debugInfo.actionsExtracted}
              </div>
              <div className="text-sm">Actions Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {debugInfo.buildOrdersGenerated}
              </div>
              <div className="text-sm">Build Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhanced.extractionTime}ms
              </div>
              <div className="text-sm">Parse Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {debugInfo.qualityCheck.activeParser === 'remastered-action-parser' ? '🎯' : '⚠️'}
              </div>
              <div className="text-sm">Remastered Parser</div>
            </div>
          </div>

          {/* Enhanced Debug Information for Remastered Action Parser */}
          {debugInfo.qualityCheck.activeParser === 'remastered-action-parser' && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">🎯 Remastered Action Parser (Enhanced)</h4>
              
              {/* Actions Overview */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-medium mb-2">Action Detection</h5>
                  <div className="space-y-1 text-sm">
                    <div>Real Actions: <Badge variant="outline">{debugInfo.actionsExtracted}</Badge></div>
                    <div>Build Orders: <Badge variant="outline">{debugInfo.buildOrdersGenerated}</Badge></div>
                    <div>Frame Count: <Badge variant="outline">{enhancedData.header.frames}</Badge></div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Parse Quality</h5>
                  <div className="space-y-1 text-sm">
                    <div>Quality: <Badge variant={debugInfo.qualityCheck.commandValidation.quality === 'realistic' ? 'default' : 'destructive'}>{debugInfo.qualityCheck.commandValidation.quality}</Badge></div>
                    <div>Remastered Format: ✅</div>
                    <div>Real Actions: ✅</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Build Orders Display */}
              {enhanced.enhancedBuildOrders && enhanced.enhancedBuildOrders.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium">Enhanced Build Orders</h5>
                  {enhanced.enhancedBuildOrders.map((buildOrder, index) => (
                    <Card key={index} className="p-3 bg-white dark:bg-gray-900">
                      <div className="flex justify-between items-start mb-2">
                        <h6 className="font-medium">Player {index + 1}</h6>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {buildOrder.race}
                          </Badge>
                          <Badge variant="outline">
                            {buildOrder.entries.length} entries
                          </Badge>
                        </div>
                      </div>
                      
                      {buildOrder.entries.length > 0 && (
                        <div className="text-sm space-y-1">
                          <div className="font-medium text-xs mb-1">First Actions:</div>
                          {buildOrder.entries.slice(0, 5).map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex justify-between text-xs">
                              <span>{entry.time}</span>
                              <span>{entry.action}</span>
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
                <div>Command Quality: <Badge variant={debugInfo.qualityCheck.commandValidation.quality === 'realistic' ? 'default' : 'destructive'}>{debugInfo.qualityCheck.commandValidation.quality}</Badge></div>
                <div>Data Quality: <Badge variant={debugInfo.qualityCheck.dataQuality === 'high' ? 'default' : 'secondary'}>{debugInfo.qualityCheck.dataQuality}</Badge></div>
                <div>Active Parser: <Badge>{debugInfo.qualityCheck.activeParser}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Extraction Stats</h4>
              <div className="space-y-1 text-sm">
                <div>Actions Extracted: <Badge variant="outline">{debugInfo.actionsExtracted}</Badge></div>
                <div>Build Orders: <Badge variant="outline">{debugInfo.buildOrdersGenerated}</Badge></div>
                <div>Time Taken: <Badge variant="outline">{enhanced.extractionTime}ms</Badge></div>
              </div>
            </div>
          </div>

          {/* APM Comparison - Updated for Remastered */}
          <div>
            <h4 className="font-semibold mb-2">APM Validation</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">screp-js APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.screpJsAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium">Direct APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.directParserAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium">Remastered APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.remasteredAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium text-green-600">Chosen APM</div>
                <div className="font-bold">{debugInfo.qualityCheck.apmValidation.chosenAPM.join(', ')}</div>
              </div>
            </div>
          </div>

          {/* Error Information - Updated for Remastered parsers */}
          {(debugInfo.directParserError || debugInfo.remasteredParserError || debugInfo.remasteredActionParserError || debugInfo.screpJsError) && (
            <div>
              <h4 className="font-semibold mb-2 text-red-600">Errors</h4>
              <div className="space-y-2 text-sm">
                {debugInfo.directParserError && (
                  <div className="p-2 bg-red-50 rounded border border-red-200">
                    <div className="font-medium">Direct Parser Error:</div>
                    <div className="text-red-700">{debugInfo.directParserError}</div>
                  </div>
                )}
                {debugInfo.remasteredParserError && (
                  <div className="p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="font-medium">BW Remastered Parser Error:</div>
                    <div className="text-orange-700">{debugInfo.remasteredParserError}</div>
                  </div>
                )}
                {debugInfo.remasteredActionParserError && (
                  <div className="p-2 bg-purple-50 rounded border border-purple-200">
                    <div className="font-medium">Remastered Action Parser Error:</div>
                    <div className="text-purple-700">{debugInfo.remasteredActionParserError}</div>
                  </div>
                )}
                {debugInfo.screpJsError && (
                  <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="font-medium">Screp-js Error:</div>
                    <div className="text-yellow-700">{debugInfo.screpJsError}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
