// Study Club Depth Flow: team server (Cloudflare Worker + D1 database).
//
// - Everything sits behind one team passcode, stored as the TEAM_PASSCODE
//   secret in Cloudflare (never in this code).
// - The app is served from ../dist. Study clubs are stored in D1, one row
//   each, as JSON. Edits arrive as small change operations and are merged
//   on the server, so teammates editing different fields don't collide.

import { applyOps } from "./ops.generated.js";

const COOKIE = "scdf_team";
const MAX_BODY = 1_000_000;
const PUBLIC_PATHS = ["/brand/", "/favicon"];

// ---------- database ----------
let schemaReady;
function ensureSchema(db) {
  schemaReady ??= db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT '',
      deleted INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      at TEXT NOT NULL
    )`),
  ]).catch((e) => {
    schemaReady = undefined;
    throw e;
  });
  return schemaReady;
}

const now = () => new Date().toISOString();
const logActivity = (db, projectId, actor, action) =>
  db.prepare("INSERT INTO activity (project_id, actor, action, at) VALUES (?, ?, ?, ?)").bind(projectId, clean(actor), action, now()).run();
const clean = (s) => String(s || "").slice(0, 120);
const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(id);

// ---------- passcode ----------
async function teamToken(passcode) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`scdf:v1:${passcode}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isSignedIn(request, env) {
  if (!env.TEAM_PASSCODE) return false;
  return safeEqual(readCookie(request, COOKIE), await teamToken(env.TEAM_PASSCODE));
}

// ---------- responses ----------
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw Object.assign(new Error("That study club is too large to save."), { status: 413 });
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw Object.assign(new Error("Malformed request."), { status: 400 });
  }
}

// ---------- API ----------
async function handleApi(request, env, url) {
  const db = env.DB;
  if (!db) return fail(500, "The team database isn’t connected. See the README: “Connect the database”.");
  await ensureSchema(db);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "projects", id?]
  const method = request.method;

  if (parts[1] === "health") return json({ ok: true });
  if (parts[1] !== "projects") return fail(404, "Not found");
  const id = parts[2] ? decodeURIComponent(parts[2]) : null;

  if (!id && method === "GET") {
    const { results } = await db.prepare("SELECT id, data, version FROM projects WHERE deleted = 0 ORDER BY created_at DESC").all();
    return json({ projects: results.map((r) => ({ id: r.id, version: r.version, data: JSON.parse(r.data) })) });
  }

  if (!id && method === "POST") {
    const { project, actor } = await readJson(request);
    if (!project || !validId(project.id)) return fail(400, "Missing study club.");
    const existing = await db.prepare("SELECT version, deleted FROM projects WHERE id = ?").bind(project.id).first();
    if (existing && !existing.deleted) return json({ version: existing.version, existed: true });
    const t = now();
    await db
      .prepare("INSERT INTO projects (id, data, version, created_at, updated_at, updated_by, deleted) VALUES (?, ?, 1, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = projects.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by, deleted = 0")
      .bind(project.id, JSON.stringify(project), t, t, clean(actor))
      .run();
    await logActivity(db, project.id, actor, "created");
    const row = await db.prepare("SELECT version FROM projects WHERE id = ?").bind(project.id).first();
    return json({ version: row.version });
  }

  if (!id || !validId(id)) return fail(404, "Not found");

  if (method === "GET") {
    const row = await db.prepare("SELECT data, version FROM projects WHERE id = ? AND deleted = 0").bind(id).first();
    return row ? json({ version: row.version, data: JSON.parse(row.data) }) : fail(404, "Not found");
  }

  // Replace the whole study club (used when importing a newer file).
  if (method === "PUT") {
    const { project, actor } = await readJson(request);
    if (!project || project.id !== id) return fail(400, "Missing study club.");
    const t = now();
    await db
      .prepare("INSERT INTO projects (id, data, version, created_at, updated_at, updated_by, deleted) VALUES (?, ?, 1, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = projects.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by, deleted = 0")
      .bind(id, JSON.stringify(project), t, t, clean(actor))
      .run();
    await logActivity(db, id, actor, "imported");
    const row = await db.prepare("SELECT version FROM projects WHERE id = ?").bind(id).first();
    return json({ version: row.version });
  }

  // Merge a batch of change operations. Retries if a teammate saved in between.
  if (method === "PATCH") {
    const { ops, actor } = await readJson(request);
    if (!Array.isArray(ops)) return fail(400, "Missing changes.");
    for (let attempt = 0; attempt < 6; attempt++) {
      const row = await db.prepare("SELECT data, version FROM projects WHERE id = ? AND deleted = 0").bind(id).first();
      if (!row) return fail(404, "That study club was deleted.");
      const doc = applyOps(JSON.parse(row.data), ops);
      const res = await db
        .prepare("UPDATE projects SET data = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?")
        .bind(JSON.stringify(doc), now(), clean(actor), id, row.version)
        .run();
      if (res.meta.changes === 1) return json({ version: row.version + 1, data: doc });
    }
    return fail(409, "Too many people saving at once. Your changes will retry.");
  }

  // Soft delete, so an accidental delete can be recovered from the database.
  if (method === "DELETE") {
    let actor = "";
    try {
      actor = (await readJson(request)).actor;
    } catch {}
    await db.prepare("UPDATE projects SET deleted = 1, updated_at = ?, updated_by = ? WHERE id = ?").bind(now(), clean(actor), id).run();
    await logActivity(db, id, actor, "deleted");
    return json({ ok: true });
  }

  return fail(405, "Not allowed");
}

// ---------- pages ----------
function page(title, body) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Study Club Depth Flow</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:"Segoe UI",Inter,system-ui,Arial,sans-serif;color:#eef2f8;background:#041e41;background-image:radial-gradient(1000px 520px at 85% -10%,rgba(90,150,255,.2),transparent 60%),radial-gradient(800px 480px at -10% 110%,rgba(60,200,190,.1),transparent 60%)}
.card{width:min(440px,92vw);padding:36px 34px;border-radius:16px;background:rgba(16,52,104,.4);border:1px solid rgba(90,150,255,.35);box-shadow:0 0 40px rgba(90,150,255,.12)}
img{height:40px;margin-bottom:26px}h1{font-size:40px;line-height:1;margin:0;font-weight:800}h1 span{color:#caa977}
p{color:#9fb0c8;line-height:1.5;margin:14px 0 22px}label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
input{width:100%;font:inherit;font-size:16px;color:#eef2f8;background:rgba(2,20,49,.6);border:1px solid rgba(140,190,255,.25);border-radius:10px;padding:12px 14px;outline:none}
input:focus{border-color:rgba(140,190,255,.7);box-shadow:0 0 0 3px rgba(90,150,255,.16)}
button{margin-top:16px;width:100%;font:inherit;font-weight:650;font-size:15px;padding:12px;border:0;border-radius:10px;cursor:pointer;color:#041e41;background:linear-gradient(180deg,#d9bc8f,#c09a62);box-shadow:0 6px 22px rgba(202,169,119,.25)}
.err{color:#ff8a7a;font-size:14px;margin:12px 0 0}code{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:5px;color:#eef2f8}
.foot{margin-top:26px;font-size:13px;color:#6f7f99}.foot b{color:#caa977;font-weight:600}
</style></head><body><main class="card"><img src="/brand/logo_white.png" alt="Heartland Dental">${body}<div class="foot">Design delivers the content. <b>Galvanization creates the depth around it.</b></div></main></body></html>`,
    { status: title === "Sign in" ? 200 : 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

const loginPage = (error = "") =>
  page(
    "Sign in",
    `<h1>GOING<br><span>DEEPER</span></h1><p>The Study Club Depth Flow. Enter the team passcode to open the planner.</p>
<form method="post" action="/login"><label for="pc">Team passcode</label><input id="pc" name="passcode" type="password" autocomplete="current-password" autofocus required>
${error ? `<p class="err">${error}</p>` : ""}<button type="submit">Open the planner</button></form>`
  );

const setupPage = () =>
  page(
    "Almost there",
    `<h1>Almost<br><span>there</span></h1><p>The planner is online, but the team passcode isn’t set yet. In Cloudflare, open this Worker’s <b>Settings › Variables and Secrets</b>, add a <b>Secret</b> named <code>TEAM_PASSCODE</code>, and deploy again.</p>`
  );

// ---------- entry ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) return env.ASSETS.fetch(request);
      if (!env.TEAM_PASSCODE) return url.pathname.startsWith("/api/") ? fail(503, "Team passcode not set.") : setupPage();

      if (url.pathname === "/login" && request.method === "POST") {
        const form = await request.formData();
        const given = String(form.get("passcode") || "");
        if (!safeEqual(await teamToken(given), await teamToken(env.TEAM_PASSCODE))) {
          await new Promise((r) => setTimeout(r, 600)); // slow down guessing
          return loginPage("That passcode didn’t match. Check with your team lead.");
        }
        const secure = url.protocol === "https:" ? "; Secure" : "";
        return new Response(null, {
          status: 303,
          headers: { location: "/", "set-cookie": `${COOKIE}=${await teamToken(env.TEAM_PASSCODE)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` },
        });
      }

      if (!(await isSignedIn(request, env))) return url.pathname.startsWith("/api/") ? fail(401, "Signed out") : loginPage();
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return url.pathname.startsWith("/api/") ? fail(e.status || 500, e.message || "Server error") : new Response("Something went wrong. Try again in a moment.", { status: 500 });
    }
  },
};
