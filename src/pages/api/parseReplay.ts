import type { NextApiRequest, NextApiResponse } from 'next';
import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';

// Disable default body parser
export const config = { api: { bodyParser: false } };

type Data = { header?: any; actions?: any[]; error?: string; };

export default async function handler(
      req: NextApiRequest,
      res: NextApiResponse<Data>
    ) {
      if (req.method !== 'POST') {
              res.setHeader('Allow', 'POST');
              return res.status(405).end('Method Not Allowed');
      }
      try {
              // Read raw request body
        const chunks: Buffer[] = [];
              await new Promise<void>((resolve, reject) => {
                        req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                        req.on('end', () => resolve());
                        req.on('error', (err) => reject(err));
              });
              const buffer = Buffer.concat(chunks);
              console.log(`parseReplay: received buffer length=${buffer.length}`);

        const parser = new ReplayParser();
              let header: any = null;
              const actions: any[] = [];

        parser.on('replayHeader', h => header = h);
              parser.on('replayAction', a => actions.push(a));
              parser.on('error', err => {
                        console.error('jssuh parsing error:', err);
                        res.status(500).json({ error: err.toString() });
              });

        parser.on('end', () => {
                  console.log(`parseReplay: parsed actions count=${actions.length}`);
                  res.status(200).json({ header, actions });
        });

        parser.end(buffer);
      } catch (err: any) {
              console.error('parseReplay exception:', err);
              res.status(500).json({ error: err.toString() });
      }
}
