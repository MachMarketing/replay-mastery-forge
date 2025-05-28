
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { EnhancedBuildOrder } from '@/services/nativeReplayParser/buildOrderMapper';

interface EnhancedBuildOrderDisplayProps {
  buildOrder: EnhancedBuildOrder;
  playerName: string;
}

export function EnhancedBuildOrderDisplay({ buildOrder, playerName }: EnhancedBuildOrderDisplayProps) {
  const getRaceColor = (race: string) => {
    switch (race?.toLowerCase()) {
      case 'protoss': return 'text-yellow-600 bg-yellow-50';
      case 'terran': return 'text-blue-600 bg-blue-50';
      case 'zerg': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getBenchmarkIcon = (status: string) => {
    switch (status) {
      case 'early':
      case 'on-time':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Race and Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{playerName} Build Order</span>
            <div className="flex items-center gap-2">
              <Badge className={getRaceColor(buildOrder.race)}>
                {buildOrder.race}
              </Badge>
              <Badge className={getGradeColor(buildOrder.efficiency.overallGrade)}>
                Grade {buildOrder.efficiency.overallGrade}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {buildOrder.efficiency.economyScore}
              </div>
              <div className="text-sm text-gray-500">Economy</div>
              <Progress value={buildOrder.efficiency.economyScore} className="h-1 mt-1" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {buildOrder.efficiency.techScore}
              </div>
              <div className="text-sm text-gray-500">Tech</div>
              <Progress value={buildOrder.efficiency.techScore} className="h-1 mt-1" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {buildOrder.efficiency.timingScore}
              </div>
              <div className="text-sm text-gray-500">Timing</div>
              <Progress value={buildOrder.efficiency.timingScore} className="h-1 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks */}
      {buildOrder.benchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Build Order Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {buildOrder.benchmarks.map((benchmark, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getBenchmarkIcon(benchmark.status)}
                    <div>
                      <div className="font-medium">{benchmark.name}</div>
                      <div className="text-sm text-gray-500">
                        Expected: {benchmark.expectedTime}
                        {benchmark.actualTime && ` • Actual: ${benchmark.actualTime}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={benchmark.importance === 'critical' ? 'destructive' : 
                               benchmark.importance === 'important' ? 'default' : 'secondary'}
                    >
                      {benchmark.importance}
                    </Badge>
                    <Badge 
                      variant={benchmark.status === 'early' || benchmark.status === 'on-time' ? 'default' : 'destructive'}
                    >
                      {benchmark.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Build Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Build Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {buildOrder.entries.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {buildOrder.entries.map((entry, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {entry.category}
                    </Badge>
                    <span className="font-medium">{entry.action}</span>
                    {entry.cost && (
                      <span className="text-xs text-gray-500">
                        {entry.cost.minerals}m
                        {entry.cost.gas > 0 && ` ${entry.cost.gas}g`}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{entry.time}</div>
                    <div className="text-xs text-gray-500">{entry.supply} supply</div>
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
  );
}
