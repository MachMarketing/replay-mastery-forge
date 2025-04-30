
export interface ParsedReplayResult {
  // adjust these fields to match your Go service output
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  duration: string;
  date: string;
  result: string;
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
}

export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/parse', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Parser error ${res.status}: ${txt}`);
  }
  return res.json();
}
