// Tiny static server bound to 127.0.0.1 (Spotify rejects "localhost" redirect URIs).
// Also proxies key/BPM lookups to ReccoBeats so the browser only ever talks to
// Spotify and this server:
//   GET /api/songinfo?ids=<spotifyTrackId>,...  ->  { results: { <id>: { key, open_key, tempo } | null } }
// Only public Spotify track ids are sent to ReccoBeats. No token or account
// data reaches this server. ReccoBeats needs no API key.
import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const RECCOBEATS_BASE = process.env.RECCOBEATS_BASE_URL || "https://api.reccobeats.com";
const CACHE_DIR = join(ROOT, ".cache");
const CACHE_FILE = join(CACHE_DIR, "songinfo.json");
const MAX_IDS = 40;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const MIN_GAP_MS = 500; // ReccoBeats is free; keep traffic polite

// ---------- cache ----------

let cache = {};
async function loadCache() {
  try { cache = JSON.parse(await readFile(CACHE_FILE, "utf8")); } catch { cache = {}; }
}
async function saveCache() {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ---------- key helpers ----------

const PITCHES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// Pitch class (0 = C) + mode (1 major, 0 minor) -> "Em" and Open Key "2m".
function describeKey(pitch, mode) {
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > 11) return { key: null, open_key: null };
  const minor = mode === 0;
  const major = minor ? (pitch + 3) % 12 : pitch; // minor keys share a number with their relative major
  return {
    key: PITCHES[pitch] + (minor ? "m" : ""),
    open_key: `${((major * 7) % 12) + 1}${minor ? "m" : "d"}`,
  };
}

// ---------- ReccoBeats ----------

let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One request at a time, spaced out, so a big library can't burst their API.
function throttled(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {}).then(() => sleep(MIN_GAP_MS));
  return run;
}

async function lookupIds(ids) {
  const missing = ids.filter((id) => !(id in cache));
  if (missing.length) {
    const url = `${RECCOBEATS_BASE}/v1/audio-features?ids=${missing.join(",")}`;
    const res = await throttled(() => fetch(url, { headers: { Accept: "application/json" } }));
    if (!res.ok) {
      const err = new Error(res.status === 429 ? "ReccoBeats rate limit hit. Wait a few minutes and try again." : `ReccoBeats request failed (${res.status})`);
      err.status = 502;
      throw err;
    }
    const data = await res.json();
    for (const id of missing) cache[id] = null; // ids they don't return are "not found"
    for (const f of Array.isArray(data.content) ? data.content : []) {
      // Results come back with their own id; the Spotify id is in href.
      const id = (f.href || "").split("/track/")[1];
      if (!missing.includes(id)) continue;
      const { key, open_key } = describeKey(f.key, f.mode);
      cache[id] = { key, open_key, tempo: typeof f.tempo === "number" ? Math.round(f.tempo) : null };
    }
    await saveCache();
  }
  return Object.fromEntries(ids.map((id) => [id, cache[id]]));
}

// ---------- HTTP ----------

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

// Blocks other websites open in your browser from using this server.
function isSameOrigin(req) {
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://127.0.0.1:${PORT}`;
}

async function handleSongInfo(req, url, res) {
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: "Cross-origin requests are not allowed." });
  const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
  if (!ids.length || ids.length > MAX_IDS || !ids.every((id) => SPOTIFY_ID.test(id))) {
    return sendJson(res, 400, { error: `ids must be 1 to ${MAX_IDS} Spotify track ids, comma separated.` });
  }
  try {
    sendJson(res, 200, { results: await lookupIds([...new Set(ids)]) });
  } catch (err) {
    console.error(`songinfo: ${err.message}`);
    sendJson(res, err.status || 500, { error: err.status ? err.message : "Lookup failed." });
  }
}

async function handleStatic(url, res) {
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  // Never serve dotfiles (.cache, .git).
  if (path.split(/[/\\]/).some((part) => part.startsWith("."))) {
    res.writeHead(404).end("Not found");
    return;
  }
  const file = join(ROOT, path === "/" ? "index.html" : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

await loadCache();

http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/api/songinfo") return handleSongInfo(req, url, res);
  return handleStatic(url, res);
}).listen(PORT, "127.0.0.1", () => console.log(`Song Sorter at http://127.0.0.1:${PORT}/`));
