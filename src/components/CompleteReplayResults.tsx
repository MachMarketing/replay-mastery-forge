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
      {/* Game Overview - VERBESSERT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            📊 {header.mapName} Analyse
            <Badge variant="outline" className="ml-auto">
              ⏱️ {header.duration}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Vollständige screp-core Analyse deines StarCraft: Remastered Replays mit echten Command-Daten
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <div className="text-sm text-muted-foreground">Spieldauer</div>
              <div className="font-bold text-lg">{header.duration}</div>
              <div className="text-xs text-muted-foreground">Minuten:Sekunden</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <div className="text-sm text-muted-foreground">Spieler</div>
              <div className="font-bold text-lg">{players.length}</div>
              <div className="text-xs text-muted-foreground">analysiert</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Activity className="h-6 w-6 mx-auto mb-1 text-purple-600" />
              <div className="text-sm text-muted-foreground">Commands</div>
              <div className="font-bold text-lg">{dataQuality.commandsFound.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">extrahiert</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Brain className="h-6 w-6 mx-auto mb-1 text-orange-600" />
              <div className="text-sm text-muted-foreground">Qualität</div>
              <div className="font-bold text-lg capitalize">{dataQuality.reliability}</div>
              <div className="text-xs text-muted-foreground">
                {dataQuality.reliability === 'high' ? 'Perfekt!' : 
                 dataQuality.reliability === 'medium' ? 'Gut' : 'Basic'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VERBESSERTE Spieler-Performance Anzeige */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            🏆 Spieler Performance-Vergleich
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            APM = Actions Per Minute (Aktionen pro Minute) • EAPM = Effective APM (sinnvolle Aktionen ohne Spam)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {players.map((player, index) => {
              // Bestimme Skill Level basierend auf EAPM
              const getSkillLevel = (eapm) => {
                if (eapm >= 180) return { level: "Pro Gamer", color: "text-red-500", bg: "bg-red-50" };
                if (eapm >= 120) return { level: "Fortgeschritten", color: "text-orange-500", bg: "bg-orange-50" };
                if (eapm >= 80) return { level: "Mittleres Niveau", color: "text-blue-500", bg: "bg-blue-50" };
                if (eapm >= 50) return { level: "Anfänger+", color: "text-green-500", bg: "bg-green-50" };
                return { level: "Anfänger", color: "text-gray-500", bg: "bg-gray-50" };
              };
              
              const skill = getSkillLevel(player.eapm);
              
              return (
                <div key={index} className={`p-6 rounded-xl border-2 ${skill.bg} transition-all hover:shadow-md`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xl">{player.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-medium">
                            {player.race} Spieler
                          </Badge>
                          <Badge className={`${skill.color} bg-transparent border-current font-semibold`}>
                            {skill.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Team</div>
                      <div className="text-2xl font-bold">{player.team}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* APM Erklärung */}
                    <div className="bg-white/80 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">Gesamt-APM</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-600">{player.apm}</div>
                      <div className="text-xs text-muted-foreground">
                        Alle Aktionen pro Minute (inkl. Spam)
                      </div>
                    </div>
                    
                    {/* EAPM Erklärung */}
                    <div className="bg-white/80 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-800">Effektive APM</span>
                      </div>
                      <div className="text-3xl font-bold text-green-600">{player.eapm}</div>
                      <div className="text-xs text-muted-foreground">
                        Nur sinnvolle Aktionen (ohne Spam)
                      </div>
                    </div>
                    
                    {/* Effizienz Erklärung */}
                    <div className="bg-white/80 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-purple-800">Effizienz</span>
                      </div>
                      <div className="text-3xl font-bold text-purple-600">{player.efficiency}%</div>
                      <div className="text-xs text-muted-foreground">
                        {player.efficiency >= 80 ? "Sehr präzise Aktionen!" : 
                         player.efficiency >= 60 ? "Gute Präzision" : 
                         "Viel Spam-Clicking"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Einschätzung */}
                  <div className="mt-4 p-3 bg-white/60 rounded-lg">
                    <div className="text-sm">
                      <span className="font-semibold">Einschätzung: </span>
                      {player.eapm >= 150 && player.efficiency >= 80 && 
                        <span className="text-green-700">🌟 Exzellente Performance! Hohe APM mit sehr präzisen Aktionen.</span>}
                      {player.eapm >= 100 && player.efficiency >= 70 && player.eapm < 150 &&
                        <span className="text-blue-700">👍 Starke Performance! Gute Balance zwischen Speed und Präzision.</span>}
                      {player.eapm >= 60 && player.efficiency >= 50 && player.eapm < 100 &&
                        <span className="text-orange-700">📈 Solide Basis! Raum für Verbesserung bei Speed oder Präzision.</span>}
                      {player.eapm < 60 && 
                        <span className="text-gray-700">🎯 Fokus auf fundamentale Spielmechaniken empfohlen.</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* VERBESSERTE Gameplay Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            🎮 Detaillierte Gameplay-Analyse
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Tiefere Einblicke in dein Spielverhalten - Stärken erkennen, Schwächen verbessern
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {players.map((player, index) => {
              const analysis = gameplayAnalysis[index];
              if (!analysis) return (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <GamepadIcon className="h-5 w-5" />
                    <h3 className="font-semibold">{player.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Keine detaillierte Analyse verfügbar
                  </p>
                </div>
              );
              
              return (
                <div key={index} className="p-6 border-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{player.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {analysis.playstyle || 'Balanced'} Spielstil
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* APM Breakdown mit Erklärungen */}
                  <div className="mb-4">
                    <h4 className="font-semibold mb-3 text-indigo-800">🔍 APM Aufschlüsselung</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/80 p-3 rounded-lg text-center">
                        <div className="text-sm font-medium text-green-700">💰 Economic</div>
                        <div className="text-xl font-bold text-green-600">
                          {analysis.apmBreakdown?.economic || Math.round(player.eapm * 0.4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Wirtschaft/Bauen
                        </div>
                      </div>
                      <div className="bg-white/80 p-3 rounded-lg text-center">
                        <div className="text-sm font-medium text-red-700">⚔️ Micro</div>
                        <div className="text-xl font-bold text-red-600">
                          {analysis.apmBreakdown?.micro || Math.round(player.eapm * 0.3)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Einheiten-Kontrolle
                        </div>
                      </div>
                      <div className="bg-white/80 p-3 rounded-lg text-center">
                        <div className="text-sm font-medium text-blue-700">✨ Effective</div>
                        <div className="text-xl font-bold text-blue-600">
                          {analysis.apmBreakdown?.effective || player.eapm}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sinnvolle Aktionen
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Skill Assessment */}
                  <div className="mb-4 p-3 bg-white/60 rounded-lg">
                    <h4 className="font-semibold mb-2 text-purple-800">📊 Skill-Einschätzung</h4>
                    <div className="text-sm">
                      <div className="mb-1">
                        <span className="font-medium">Spielstil: </span>
                        <span className="capitalize">
                          {analysis.playstyle === 'aggressive' && '⚔️ Aggressiv - Du greifst früh und oft an'}
                          {analysis.playstyle === 'defensive' && '🛡️ Defensiv - Du baust starke Verteidigung auf'}
                          {analysis.playstyle === 'economic' && '💰 Wirtschaftlich - Du fokussierst auf starke Ökonomie'}
                          {analysis.playstyle === 'micro-intensive' && '🎯 Micro-intensiv - Du kontrollierst Einheiten sehr präzise'}
                          {analysis.playstyle === 'macro-focused' && '🏗️ Makro-orientiert - Du baust effizient und planvoll'}
                          {!analysis.playstyle && '⚖️ Ausgewogen - Gute Balance in allen Bereichen'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Micro Events (falls vorhanden) */}
                  {analysis.microEvents && analysis.microEvents.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-orange-800">⚡ Micro-Highlights</h4>
                      <div className="space-y-1 text-sm bg-white/60 p-3 rounded-lg">
                        {analysis.microEvents.slice(0, 3).map((event, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="font-mono text-xs">{event.time}</span>
                            <span className="text-muted-foreground">{event.action}</span>
                            <Badge variant="outline" className="text-xs">
                              Intensität: {event.intensity || 'Normal'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Stärken & Schwächen */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">💪 Deine Stärken</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        {analysis.strengths && analysis.strengths.length > 0 ? (
                          analysis.strengths.slice(0, 3).map((strength, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-600">•</span>
                              {strength}
                            </li>
                          ))
                        ) : (
                          <>
                            {player.efficiency >= 80 && <li className="flex items-start gap-1"><span className="text-green-600">•</span>Sehr präzise Aktionen</li>}
                            {player.apm >= 150 && <li className="flex items-start gap-1"><span className="text-green-600">•</span>Hohe Aktionsgeschwindigkeit</li>}
                            {player.eapm >= 100 && <li className="flex items-start gap-1"><span className="text-green-600">•</span>Effektive Spielweise</li>}
                            {player.efficiency < 80 && player.apm < 150 && player.eapm < 100 && 
                              <li className="flex items-start gap-1"><span className="text-green-600">•</span>Solide Grundlagen</li>}
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-2">🎯 Verbesserungspotential</h4>
                      <ul className="text-sm text-orange-700 space-y-1">
                        {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                          analysis.weaknesses.slice(0, 3).map((weakness, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-orange-600">•</span>
                              {weakness}
                            </li>
                          ))
                        ) : (
                          <>
                            {player.efficiency < 60 && <li className="flex items-start gap-1"><span className="text-orange-600">•</span>Reduziere Spam-Aktionen</li>}
                            {player.apm < 100 && <li className="flex items-start gap-1"><span className="text-orange-600">•</span>Erhöhe Aktionsgeschwindigkeit</li>}
                            {player.eapm < 80 && <li className="flex items-start gap-1"><span className="text-orange-600">•</span>Mehr sinnvolle Aktionen</li>}
                            {player.efficiency >= 60 && player.apm >= 100 && player.eapm >= 80 && 
                              <li className="flex items-start gap-1"><span className="text-orange-600">•</span>Optimiere Build-Timing</li>}
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Empfehlungen */}
                  {(analysis.recommendations && analysis.recommendations.length > 0) && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">💡 Verbesserungs-Tipps</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {analysis.recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-blue-600">•</span>
                            {rec}
                          </li>
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

      {/* Build Orders - DER WICHTIGSTE TEIL - VERBESSERT */}
      {Object.keys(buildOrders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              🏗️ Build Order Analyse - Die echten Spielzüge!
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Hier siehst du die exakte Reihenfolge aller Gebäude, Einheiten und Upgrades - perfekt um Strategien zu verstehen und zu verbessern!
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.entries(buildOrders).map(([playerIdStr, playerBuildOrder]) => {
                const playerId = parseInt(playerIdStr);
                const player = players[playerId];
                
                if (!player || !playerBuildOrder || playerBuildOrder.length === 0) return null;
                
                return (
                  <div key={playerId} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{player.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-medium">
                            {player.race} Build Order
                          </Badge>
                          <Badge variant="secondary">
                            {playerBuildOrder.length} Aktionen
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-20 font-semibold">⏰ Zeit</TableHead>
                            <TableHead className="w-20 font-semibold">📊 Supply</TableHead>
                            <TableHead className="font-semibold">🎯 Was wurde gebaut/trainiert</TableHead>
                            <TableHead className="font-semibold">🏗️ Einheit/Gebäude</TableHead>
                            <TableHead className="w-24 font-semibold">📝 Typ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {playerBuildOrder.slice(0, 25).map((entry, index) => {
                            // Kategorize für bessere Darstellung
                            const getCategoryInfo = (category) => {
                              switch(category) {
                                case 'build': return { icon: '🏗️', color: 'bg-blue-100 text-blue-800', label: 'Gebäude' };
                                case 'train': return { icon: '👥', color: 'bg-green-100 text-green-800', label: 'Einheit' };
                                case 'tech': return { icon: '🔬', color: 'bg-purple-100 text-purple-800', label: 'Forschung' };
                                case 'upgrade': return { icon: '⬆️', color: 'bg-orange-100 text-orange-800', label: 'Upgrade' };
                                default: return { icon: '❓', color: 'bg-gray-100 text-gray-800', label: 'Sonstiges' };
                              }
                            };
                            
                            const categoryInfo = getCategoryInfo(entry.category);
                            
                            return (
                              <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-mono text-sm font-medium">
                                  {entry.time}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.supply}/200
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="font-medium">{entry.action}</div>
                                  {entry.unitName && entry.unitName !== 'Unknown' && (
                                    <div className="text-xs text-muted-foreground">
                                      → {entry.unitName}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <span className="font-medium">
                                    {entry.unitName || 'Unbekannt'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge className={`text-xs ${categoryInfo.color} border-0`}>
                                    {categoryInfo.icon} {categoryInfo.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      
                      {playerBuildOrder.length > 25 && (
                        <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                          ... und {playerBuildOrder.length - 25} weitere Aktionen
                        </div>
                      )}
                    </div>
                    
                    {/* Build Order Zusammenfassung */}
                    <div className="mt-4 p-3 bg-white/60 rounded-lg">
                      <div className="text-sm">
                        <span className="font-semibold">Build Order Einschätzung: </span>
                        {playerBuildOrder.length >= 20 ? (
                          <span className="text-green-700">
                            🌟 Sehr aktive Build Order mit {playerBuildOrder.length} dokumentierten Aktionen!
                          </span>
                        ) : playerBuildOrder.length >= 10 ? (
                          <span className="text-blue-700">
                            👍 Solide Build Order mit {playerBuildOrder.length} Aktionen
                          </span>
                        ) : (
                          <span className="text-orange-700">
                            📝 Kurzes Spiel oder wenige dokumentierte Aktionen ({playerBuildOrder.length})
                          </span>
                        )}
                      </div>
                    </div>
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