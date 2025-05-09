
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { AdvancedMetrics, ExtendedReplayData } from '@/services/replayParser/types';
import { ArrowUpCircle, ArrowDownCircle, Zap, Clock, Cpu, BarChart2 } from 'lucide-react';

interface AdvancedMetricsDisplayProps {
  data: ExtendedReplayData | null;
  activePlayerIndex: number;
}

const AdvancedMetricsDisplay: React.FC<AdvancedMetricsDisplayProps> = ({ data, activePlayerIndex }) => {
  const [activeTab, setActiveTab] = useState('buildOrder');
  
  if (!data || !data.advancedMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erweiterte Metriken</CardTitle>
          <CardDescription>Keine Daten verfügbar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            Keine erweiterten Metriken für dieses Replay verfügbar
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get the player key based on active player index
  const playerKey = activePlayerIndex === 0 ? 'player1' : 'player2';
  const metrics = data.advancedMetrics;
  const playerName = activePlayerIndex === 0 ? data.primaryPlayer.name : data.secondaryPlayer.name;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart2 className="mr-2 h-5 w-5" />
          Erweiterte Metriken für {playerName}
        </CardTitle>
        <CardDescription>
          Detaillierte Spielanalyse und Leistungsmetriken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="buildOrder">Build Order</TabsTrigger>
            <TabsTrigger value="resources">Ressourcen</TabsTrigger>
            <TabsTrigger value="supply">Supply</TabsTrigger>
            <TabsTrigger value="army">Armee</TabsTrigger>
            <TabsTrigger value="production">Produktion</TabsTrigger>
            <TabsTrigger value="actions">Aktionen</TabsTrigger>
          </TabsList>
          
          {/* Build Order Tab */}
          <TabsContent value="buildOrder" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Build Order & Upgrades</h3>
              <Badge variant="outline" className="ml-auto">
                {metrics.buildOrderTiming[playerKey].length} Einträge
              </Badge>
            </div>
            
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-2">Zeit</th>
                    <th className="text-left font-medium py-2">Supply</th>
                    <th className="text-left font-medium py-2">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.buildOrderTiming[playerKey].map((item, idx) => (
                    <tr key={idx} className="border-b border-muted hover:bg-muted/50">
                      <td className="py-2">{item.timeFormatted}</td>
                      <td className="py-2">{item.supply}</td>
                      <td className="py-2">{item.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {metrics.techPath[playerKey].length > 0 && (
              <div>
                <h3 className="text-md font-medium mt-4 mb-2">Tech Pfad</h3>
                <div className="flex flex-wrap gap-2">
                  {metrics.techPath[playerKey].map((tech, idx) => (
                    <Badge key={idx} variant={tech.type === 'research' ? 'default' : 'outline'}>
                      {tech.timeFormatted} {tech.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Resources Tab */}
          <TabsContent value="resources">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Ressourcensammlung</h3>
              </div>
              
              {metrics.resourceCollection[playerKey].collectionRate.minerals.length > 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics.resourceCollection[playerKey].collectionRate.minerals}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timeFormatted" 
                        label={{ value: 'Spielzeit', position: 'insideBottom', offset: -5 }} 
                      />
                      <YAxis label={{ value: 'Mineralien', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value} Mineralien`, 'Sammlung']}
                        labelFormatter={(label) => `Zeit: ${label}`}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" name="Mineralien" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-4 border rounded-md">
                  <p className="text-muted-foreground text-sm">
                    Nicht genügend Ressourcendaten für eine Grafik
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-md font-medium mt-4 mb-2">Ungenutzte Ressourcen</h3>
                {metrics.resourceCollection[playerKey].unspentResources.minerals.length > 0 ? (
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Durchschnittlich ungenutzt</p>
                      <div className="flex items-center">
                        <span className="text-xl font-bold">
                          {calculateAverage(metrics.resourceCollection[playerKey].unspentResources.minerals)}
                        </span>
                        <span className="ml-1 text-sm text-muted-foreground">Mineralien</span>
                      </div>
                    </div>
                    
                    {metrics.resourceCollection[playerKey].unspentResources.gas.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Durchschnittlich ungenutzt</p>
                        <div className="flex items-center">
                          <span className="text-xl font-bold">
                            {calculateAverage(metrics.resourceCollection[playerKey].unspentResources.gas)}
                          </span>
                          <span className="ml-1 text-sm text-muted-foreground">Gas</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keine Daten zu ungenutzten Ressourcen verfügbar
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Supply Tab */}
          <TabsContent value="supply">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Supply-Management</h3>
                <Badge variant="outline">
                  {metrics.supplyManagement[playerKey].supplyBlocks.length} Supply-Blocks
                </Badge>
              </div>
              
              {metrics.supplyManagement[playerKey].supplyUsage.length > 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics.supplyManagement[playerKey].supplyUsage}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeFormatted" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="used" stroke="#3b82f6" name="Genutztes Supply" />
                      <Line type="monotone" dataKey="total" stroke="#10b981" name="Max Supply" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-4 border rounded-md">
                  <p className="text-muted-foreground text-sm">
                    Nicht genügend Supply-Daten für eine Grafik
                  </p>
                </div>
              )}
              
              {metrics.supplyManagement[playerKey].supplyBlocks.length > 0 ? (
                <div>
                  <h3 className="text-md font-medium mt-4 mb-2">Supply-Block-Analyse</h3>
                  <div className="max-h-40 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium py-2">Start</th>
                          <th className="text-left font-medium py-2">Ende</th>
                          <th className="text-right font-medium py-2">Dauer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.supplyManagement[playerKey].supplyBlocks.map((block, idx) => (
                          <tr key={idx} className="border-b border-muted hover:bg-muted/50">
                            <td className="py-2">{block.startTimeFormatted}</td>
                            <td className="py-2">{block.endTimeFormatted}</td>
                            <td className="py-2 text-right">
                              {block.durationSeconds}s
                              {block.durationSeconds > 15 && (
                                <Badge variant="destructive" className="ml-2">Lang</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center p-4 border rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                  <ArrowUpCircle className="h-6 w-6 text-emerald-500 mr-2" />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Ausgezeichnet! Keine Supply-Blocks im gesamten Spiel.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Army Tab */}
          <TabsContent value="army">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Armeewert & Komposition</h3>
              </div>
              
              {metrics.armyValueOverTime[playerKey].armyValueOverTime.length > 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics.armyValueOverTime[playerKey].armyValueOverTime}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeFormatted" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} Ressourcen`, 'Armeewert']} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6"
                        name="Armeewert" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-4 border rounded-md">
                  <p className="text-muted-foreground text-sm">
                    Nicht genügend Armee-Daten für eine Grafik
                  </p>
                </div>
              )}
              
              {metrics.armyValueOverTime[playerKey].unitComposition.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mt-4 mb-2">Einheitenkomposition</h3>
                  {metrics.armyValueOverTime[playerKey].unitComposition.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getUnitCompositionForChart(
                              metrics.armyValueOverTime[playerKey].unitComposition[
                                metrics.armyValueOverTime[playerKey].unitComposition.length - 1
                              ]?.composition
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {getUnitCompositionForChart(
                              metrics.armyValueOverTime[playerKey].unitComposition[
                                metrics.armyValueOverTime[playerKey].unitComposition.length - 1
                              ]?.composition
                            ).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getRandomColor(index)} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} Einheiten`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Keine Einheitenkomposition-Daten verfügbar
                    </p>
                  )}
                </div>
              )}
              
              {/* Expansion timing */}
              {metrics.expansionTiming[playerKey].length > 0 && (
                <div>
                  <h3 className="text-md font-medium mt-4 mb-2">Expansionen</h3>
                  <div className="flex flex-wrap gap-2">
                    {metrics.expansionTiming[playerKey].map((exp, idx) => (
                      <Badge key={idx} variant="outline">
                        {idx + 1}. Expansion: {exp.timeFormatted}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Production Tab */}
          <TabsContent value="production">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Produktionseffizienz</h3>
              </div>
              
              {metrics.productionEfficiency[playerKey].idleProductionTime.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Produktionsleerlaufzeit</span>
                    <span>{metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage} 
                    className="h-2" 
                    indicatorClassName={
                      metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage < 15 
                        ? "bg-emerald-500" 
                        : metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage < 30 
                          ? "bg-amber-500" 
                          : "bg-red-500"
                    }
                  />
                  
                  <div className="mt-4 p-4 border rounded-md bg-muted">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium">Produktionsleerlaufzeit-Analyse</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage < 15 
                        ? "Herausragende Produktionseffizienz! Deine Produktionsgebäude sind fast konstant aktiv."
                        : metrics.productionEfficiency[playerKey].idleProductionTime[0].percentage < 30 
                          ? "Gute Produktionseffizienz, aber es gibt noch Verbesserungspotential."
                          : "Deine Produktionsgebäude sind oft inaktiv. Fokussiere dich auf kontinuierliche Produktion."
                      }
                    </p>
                  </div>
                </div>
              ) : metrics.productionEfficiency[playerKey].productionFacilities.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={metrics.productionEfficiency[playerKey].productionFacilities}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeFormatted" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Produktionsgebäude" />
                      <Line type="monotone" dataKey="idle" stroke="#ef4444" name="Inaktiv" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-4 border rounded-md">
                  <p className="text-muted-foreground text-sm">
                    Keine Produktionseffizienz-Daten verfügbar
                  </p>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-md font-medium mb-2">Wirtschaftswachstum</h3>
                {metrics.expansionTiming[playerKey].length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {getExpansionAnalysis(metrics.expansionTiming[playerKey])}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {metrics.expansionTiming[playerKey].map((exp, idx) => (
                        <div key={idx} className="flex items-center border rounded-md px-3 py-1 text-sm">
                          <span className="font-medium mr-1">Base {idx + 2}:</span>
                          <span>{exp.timeFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center p-4 border rounded-md bg-amber-50 dark:bg-amber-950/20">
                    <ArrowDownCircle className="h-6 w-6 text-amber-500 mr-2" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Keine Expansionen erkannt. Eine größere Wirtschaft könnte dir Vorteile bringen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Actions Tab */}
          <TabsContent value="actions">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Aktionsverteilung</h3>
              </div>
              
              {/* APM Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Zap className="h-8 w-8 text-amber-500 mb-2" />
                      <p className="text-sm font-medium">APM</p>
                      <p className="text-3xl font-bold">
                        {activePlayerIndex === 0 ? data.primaryPlayer.apm : data.secondaryPlayer.apm}
                      </p>
                      <p className="text-xs text-muted-foreground">Aktionen pro Minute</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Cpu className="h-8 w-8 text-emerald-500 mb-2" />
                      <p className="text-sm font-medium">EAPM</p>
                      <p className="text-3xl font-bold">
                        {activePlayerIndex === 0 ? data.primaryPlayer.eapm : data.secondaryPlayer.eapm}
                      </p>
                      <p className="text-xs text-muted-foreground">Effektive Aktionen pro Minute</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Clock className="h-8 w-8 text-blue-500 mb-2" />
                      <p className="text-sm font-medium">Hotkey APM</p>
                      <p className="text-3xl font-bold">
                        {metrics.hotkeyUsage[playerKey].hotkeyActionsPerMinute}
                      </p>
                      <p className="text-xs text-muted-foreground">Hotkey-Aktionen pro Minute</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Action Distribution */}
              {metrics.actionDistribution[playerKey].total > 0 ? (
                <div>
                  <h3 className="text-md font-medium mt-4 mb-2">Aktionsverteilung</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Makro', value: metrics.actionDistribution[playerKey].macroPercentage },
                            { name: 'Mikro', value: metrics.actionDistribution[playerKey].microPercentage },
                            { name: 'Andere', value: metrics.actionDistribution[playerKey].otherPercentage },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name} ${value}%`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#6b7280" />
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-md">
                  <p className="text-muted-foreground text-sm">
                    Keine Aktionsverteilungs-Daten verfügbar
                  </p>
                </div>
              )}
              
              {/* Hotkey Distribution */}
              {Object.keys(metrics.hotkeyUsage[playerKey].hotkeyDistribution).length > 0 ? (
                <div>
                  <h3 className="text-md font-medium mt-4 mb-2">Hotkey-Nutzung</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getHotkeyDistributionData(metrics.hotkeyUsage[playerKey].hotkeyDistribution)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} mal verwendet`]} />
                        <Bar dataKey="value" fill="#3b82f6" name="Nutzung" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-2 p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">
                      {getHotkeyAnalysis(metrics.hotkeyUsage[playerKey])}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center">
                    <ArrowDownCircle className="h-6 w-6 text-amber-500 mr-2" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Sehr geringe oder keine Hotkey-Nutzung erkannt. Die Verwendung von Hotkeys kann deine Effizienz stark verbessern.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper functions

function calculateAverage(data: Array<{ value: number }>): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + item.value, 0);
  return Math.round(sum / data.length);
}

function getUnitCompositionForChart(composition: Record<string, number> = {}): Array<{ name: string, value: number }> {
  if (!composition) return [];
  
  return Object.entries(composition)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({ 
      name: name.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capital letters
      value: count 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Limit to top 8 units
}

function getRandomColor(index: number): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  return colors[index % colors.length];
}

function getHotkeyDistributionData(distribution: Record<string, number>): Array<{ name: string, value: number }> {
  if (!distribution) return [];
  
  return Object.entries(distribution)
    .map(([key, count]) => ({ 
      name: `Gruppe ${key}`, 
      value: count 
    }))
    .sort((a, b) => b.value - a.value);
}

function getHotkeyAnalysis(hotkeyData: { hotkeyActions: number, hotkeyActionsPerMinute: number }): string {
  const { hotkeyActions, hotkeyActionsPerMinute } = hotkeyData;
  
  if (hotkeyActionsPerMinute < 5) {
    return "Sehr geringe Hotkey-Nutzung. Die Verwendung von Kontrollgruppen kann deine Effizienz erheblich steigern.";
  } else if (hotkeyActionsPerMinute < 20) {
    return "Moderate Hotkey-Nutzung. Du könntest von einer stärkeren Verwendung von Kontrollgruppen profitieren.";
  } else if (hotkeyActionsPerMinute < 40) {
    return "Gute Hotkey-Nutzung. Du nutzt Kontrollgruppen effektiv, was deine Spielgeschwindigkeit verbessert.";
  } else {
    return "Ausgezeichnete Hotkey-Nutzung! Du nutzt Kontrollgruppen sehr effektiv, was deine APM und Spielgeschwindigkeit maximiert.";
  }
}

function getExpansionAnalysis(expansions: Array<any>): string {
  if (expansions.length === 0) {
    return "Keine Expansionen erkannt. Eine größere Wirtschaft würde dir mehr Ressourcen für deine Armee geben.";
  }
  
  const firstExpansionTime = expansions[0].time;
  
  if (firstExpansionTime < 24 * 240) { // Before 4 minutes
    return "Schnelle wirtschaftsorientierte Expansion. Du hast früh expandiert, was dir einen wirtschaftlichen Vorteil geben kann, aber möglicherweise anfälliger für frühe Angriffe macht.";
  } else if (firstExpansionTime < 24 * 360) { // Before 6 minutes
    return "Standard-Timing für die erste Expansion. Du hast zu einem soliden Zeitpunkt expandiert, was ein gutes Gleichgewicht zwischen Wirtschaft und Sicherheit bietet.";
  } else {
    return "Späte erste Expansion. Eine frühere Expansion könnte dir einen stärkeren wirtschaftlichen Vorteil verschaffen.";
  }
}

export default AdvancedMetricsDisplay;
