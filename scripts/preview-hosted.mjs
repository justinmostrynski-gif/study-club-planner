// Run the hosted version on your own computer, without Cloudflare.
// Uses the real server code (worker/index.js) with a local SQLite file
// standing in for Cloudflare's D1 database. Needs Node.js 22.5 or newer.
//
//   node scripts/build.mjs
//   node scripts/preview-hosted.mjs            (passcode: preview)
//   then open http://localhost:8787
//
// Options: PORT=8787 TEAM_PASSCODE=preview DB_FILE=.preview/preview.db

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8787);
const dbFile = process.env.DB_FILE || join(root, ".preview", "preview.db");
await mkdir(dirname(dbFile), { recursive: true });
const sqlite = new DatabaseSync(dbFile);

// Just enough of the D1 API for worker/index.js.
function statement(sql, args = []) {
  return {
    bind: (...a) => statement(sql, a),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => {
      const r = sqlite.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
  };
}
const DB = { prepare: (sql) => statement(sql), batch: async (stmts) => Promise.all(stmts.map((s) => s.run())) };

const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const ASSETS = {
  async fetch(request) {
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(root, "dist", path));
    if (!file.startsWith(join(root, "dist"))) return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(file), { headers: { "content-type": TYPES[extname(file)] || "application/octet-stream" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};

const env = { DB, ASSETS, TEAM_PASSCODE: process.env.TEAM_PASSCODE ?? "preview" };

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  const response = await worker.fetch(request, env);
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`Hosted preview on http://localhost:${PORT}  (passcode: ${env.TEAM_PASSCODE || "not set"})`));
