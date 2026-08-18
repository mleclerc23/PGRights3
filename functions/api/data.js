// Cloudflare Pages Function — serves /api/data
//
// GET  /api/data  -> { data: <stored JSON, or null if nothing saved yet> }
// POST /api/data  -> body { data: <any JSON> }, overwrites the stored blob
//
// Requires:
//   - A KV namespace bound to this project as TRACKER_KV
//     (Dashboard: Pages project > Settings > Bindings > Add > KV namespace)
//   - An environment variable APP_PASSWORD set to the same value as
//     ACCESS_PASSWORD in index.html, so the API rejects requests that
//     didn't come through the site's own password gate.
//     (Dashboard: Pages project > Settings > Environment variables)
//
// This is intentionally a single shared record (key "tracker-data") for
// the whole team, matching the app's existing "one JSON blob" storage
// model. Last write wins on concurrent saves.

const KV_KEY = "tracker-data";

function checkAuth(request, env) {
  const provided = request.headers.get("x-app-password");
  return Boolean(env.APP_PASSWORD) && provided === env.APP_PASSWORD;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.TRACKER_KV) {
    return new Response("TRACKER_KV binding is not configured", { status: 500 });
  }
  const raw = await env.TRACKER_KV.get(KV_KEY);
  return new Response(JSON.stringify({ data: raw ? JSON.parse(raw) : null }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.TRACKER_KV) {
    return new Response("TRACKER_KV binding is not configured", { status: 500 });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }
  await env.TRACKER_KV.put(KV_KEY, JSON.stringify(body.data));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
