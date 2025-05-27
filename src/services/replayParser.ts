import { ParsedReplayData } from './replayParser/types';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  const buf = await file.arrayBuffer();
  const parserUrl = import.meta.env.VITE_PARSER_URL!;
  console.log('[replayParser] POST to', parserUrl);

  const res = await fetch(parserUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buf,
  });
  console.log('[replayParser] status', res.status);

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Parsing fehlgeschlagen: ${err?.error || res.statusText}`);
  }
  const data = await res.json();
  console.log('[replayParser] data keys', Object.keys(data));
  return data as ParsedReplayData;
}
