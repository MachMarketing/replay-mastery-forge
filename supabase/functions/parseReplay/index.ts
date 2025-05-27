import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "3600",
};

serve(async (req) => {
  console.log("[parseReplay] Request", req.method, req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length < 1024 || buf.length > 10 * 1024 * 1024) {
      throw new Error("Ungültige Dateigröße");
    }
    // JS‐Port des SCREP-Parsers
    const mod = await import("https://esm.sh/screp-js-file");
    const parse = mod.parse;
    if (typeof parse !== "function") throw new Error("Parser-Funktion nicht gefunden");
    const parsed = parse(buf);
    console.log("[parseReplay] header:", parsed.header);

    const result = {
      players:  parsed.players,
      commands: parsed.commands,
      header: {
        frames:  parsed.header.frames,
        mapName: parsed.header.mapName,
      },
    };
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[parseReplay] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
