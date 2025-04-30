export interface ParsedReplayResult {
    header: any;
    actions: any[];
}

/**
 * Uploads a .rep file to our Next.js API and returns the parsed result
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
    const arrayBuffer = await file.arrayBuffer();
    const response = await fetch('/api/parseReplay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: arrayBuffer,
    });
    if (!response.ok) {
          const text = await response.text();
          throw new Error(`Parse error: ${response.status} ${text}`);
    }
    return response.json();
}
