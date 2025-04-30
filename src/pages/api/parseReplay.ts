import type { NextApiRequest, NextApiResponse } from 'next';
import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';

// Disable default body parser to accept raw binary
export const config = {
    api: { bodyParser: false }
};

type Data = {
    header?: any;
    actions?: any[];
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
  ) {
    if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return res.status(405).end('Method Not Allowed');
    }

  try {
        // Collect raw body chunks
      const chunks: Uint8Array[] = [];
        for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const buffer = Buffer.concat(chunks);

      const parser = new ReplayParser();
        let header: any = null;
        const actions: any[] = [];

      parser.on('replayHeader', (h) => {
              header = h;
      });
        parser.on('replayAction', (a) => {
                actions.push(a);
        });

      parser.on('end', () => {
              res.status(200).json({ header, actions });
      });

      parser.on('error', (err) => {
              res.status(500).json({ error: err.toString() });
      });

      // Start parsing
      parser.end(buffer);
  } catch (err: any) {
        res.status(500).json({ error: err.toString() });
  }
}
