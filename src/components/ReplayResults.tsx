
/**
 * Clean results display for parsed replay data
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RemasteredReplayData } from '@/services/replayParser/scRemasteredParser';

interface ReplayResultsProps {
  data: RemasteredReplayData;
}

const ReplayResults: React.FC<ReplayResultsProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{data.header.mapName}</span>
            <Badge variant="outline">{data.header.duration}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Engine:</span>
              <div className="font-medium">{data.header.engine}</div>
            </div>
            <div>
              <span className="text-gray-500">Frames:</span>
              <div className="font-medium">{data.header.frames.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Commands:</span>
              <div className="font-medium">{data.rawData.totalCommands}</div>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <div className="font-medium">{data.rawData.gameMinutes.toFixed(1)} min</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.players.map((player) => (
          <Card key={player.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{player.name}</span>
                <Badge>{player.race}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">APM:</span>
                  <div className="text-xl font-bold text-blue-600">{player.apm}</div>
                </div>
                <div>
                  <span className="text-gray-500">EAPM:</span>
                  <div className="text-xl font-bold text-green-600">{player.eapm}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Build Orders */}
      {data.buildOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.buildOrders.map((buildOrder) => {
            const player = data.players.find(p => p.id === buildOrder.playerId);
            return (
              <Card key={buildOrder.playerId}>
                <CardHeader>
                  <CardTitle>
                    {player?.name || `Player ${buildOrder.playerId + 1}`} - Build Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {buildOrder.entries.slice(0, 10).map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{entry.time}</span>
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-xs text-gray-400">{entry.supply}</span>
                      </div>
                    ))}
                    {buildOrder.entries.length > 10 && (
                      <div className="text-xs text-gray-500 text-center">
                        ... und {buildOrder.entries.length - 10} weitere
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReplayResults;
