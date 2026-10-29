// Cloudflare Pages Function: serves /api/files  (put this file at functions/api/files.js)
//
// POST   /api/files?id=<id>&name=<filename>   body = the raw file bytes   -> { ok: true }
// GET    /api/files?id=<id>                                               -> the file
// DELETE /api/files?id=<id>                                               -> { ok: true }
//
// Uses the same KV binding (TRACKER_KV) and APP_PASSWORD as /api/data.
// Each file is its own KV entry ("file:<id>"), so uploads never touch the main data record.
// KV values can be up to 25 MiB; the app enforces a 20 MB limit per file.

const MAX_BYTES = 20 * 1024 * 1024;
const ID_RE = /^[A-Za-z0-9_-]{4,80}$/;

function checkAuth(request, env) {
  const provided = request.headers.get("x-app-password");
  return Boolean(env.APP_PASSWORD) && provided === env.APP_PASSWORD;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
function guard(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return new Response("Unauthorized", { status: 401 });
  if (!env.TRACKER_KV) return new Response("TRACKER_KV binding is not configured", { status: 500 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!ID_RE.test(id)) return new Response("Bad id", { status: 400 });
  return null;
}

export async function onRequestPost(context) {
  const bad = guard(context);
  if (bad) return bad;
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const name = (url.searchParams.get("name") || "file").slice(0, 200);
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: "File too large" }, 413);
  await env.TRACKER_KV.put("file:" + id, buf, {
    metadata: { name, type: request.headers.get("content-type") || "application/octet-stream", size: buf.byteLength },
  });
  return json({ ok: true });
}

export async function onRequestGet(context) {
  const bad = guard(context);
  if (bad) return bad;
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get("id");
  const { value, metadata } = await env.TRACKER_KV.getWithMetadata("file:" + id, { type: "arrayBuffer" });
  if (!value) return new Response("Not found", { status: 404 });
  const name = (metadata && metadata.name) || "file";
  return new Response(value, {
    headers: {
      "Content-Type": (metadata && metadata.type) || "application/octet-stream",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(name),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function onRequestDelete(context) {
  const bad = guard(context);
  if (bad) return bad;
  const { request, env } = context;
  await env.TRACKER_KV.delete("file:" + new URL(request.url).searchParams.get("id"));
  return json({ ok: true });
}
