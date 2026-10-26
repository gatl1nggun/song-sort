// Tiny static server bound to 127.0.0.1 (Spotify rejects "localhost" redirect URIs).
// Also proxies key/BPM lookups to GetSongBPM so the API key stays on this machine:
//   GET /api/songinfo?title=...&artist=...  ->  { found, key, open_key, tempo, source_url }
// Only the title and artist are sent to GetSongBPM. Nothing from Spotify
// (tokens, ids, account data) reaches this server.
import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const GETSONG_BASE = process.env.GETSONGBPM_BASE_URL || "https://api.getsong.co";
const CACHE_DIR = join(ROOT, ".cache");
const CACHE_FILE = join(CACHE_DIR, "songinfo.json");
const MAX_FIELD = 200;
const MIN_GAP_MS = 250; // spaces out calls; GetSongBPM allows 3,000 per hour

// ---------- .env ----------

async function loadEnv() {
  try {
    const text = await readFile(join(ROOT, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env file: lookups report that the key is missing.
  }
}

// ---------- cache ----------

let cache = {};
async function loadCache() {
  try { cache = JSON.parse(await readFile(CACHE_FILE, "utf8")); } catch { cache = {}; }
}
async function saveCache() {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ---------- GetSongBPM ----------

let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One request at a time, spaced out, so a big library can't burst the rate limit.
function throttled(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {}).then(() => sleep(MIN_GAP_MS));
  return run;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pickMatch(results, title, artist) {
  const t = norm(title);
  const artists = artist.split(",").map(norm);
  const scored = results.map((r) => {
    let score = 0;
    if (norm(r.title || "") === t) score += 2;
    if (artists.includes(norm(r.artist?.name || ""))) score += 2;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.length && scored[0].score >= 2 ? scored[0].r : null;
}

async function lookupSong(title, artist) {
  const cacheKey = `${norm(title)}|${norm(artist)}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) {
    const err = new Error("GETSONGBPM_API_KEY is not set. Add it to .env and restart the server.");
    err.status = 503;
    throw err;
  }

  // First listed artist only; GetSongBPM matches better on a single name.
  const lookup = `song:${title} artist:${artist.split(",")[0].trim()}`;
  const url = `${GETSONG_BASE}/search/?type=both&limit=5&lookup=${encodeURIComponent(lookup)}`;

  const res = await throttled(() => fetch(url, { headers: { "X-API-KEY": apiKey } }));
  if (!res.ok) {
    const err = new Error(res.status === 429 ? "GetSongBPM rate limit hit. Try again in an hour." : `GetSongBPM request failed (${res.status})`);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  // "search" is an array of matches, or an object with an error when nothing matched.
  const results = Array.isArray(data.search) ? data.search : [];
  const match = pickMatch(results, title, artist);

  const info = match
    ? { found: true, key: match.key_of || null, open_key: match.open_key || null,
        tempo: match.tempo ? Number(match.tempo) : null, source_url: match.uri || null }
    : { found: false, key: null, open_key: null, tempo: null, source_url: null };

  cache[cacheKey] = info;
  await saveCache();
  return info;
}

// ---------- HTTP ----------

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

// Blocks other websites open in your browser from using your key through this server.
function isSameOrigin(req) {
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://127.0.0.1:${PORT}`;
}

async function handleSongInfo(req, url, res) {
  if (!isSameOrigin(req)) return sendJson(res, 403, { error: "Cross-origin requests are not allowed." });
  const title = url.searchParams.get("title") || "";
  const artist = url.searchParams.get("artist") || "";
  if (!title.trim() || !artist.trim() || title.length > MAX_FIELD || artist.length > MAX_FIELD) {
    return sendJson(res, 400, { error: "title and artist are required (max 200 characters each)." });
  }
  try {
    sendJson(res, 200, await lookupSong(title, artist));
  } catch (err) {
    console.error(`songinfo: ${err.message}`);
    sendJson(res, err.status || 500, { error: err.status ? err.message : "Lookup failed." });
  }
}

async function handleStatic(url, res) {
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  // Never serve dotfiles (.env, .cache, .git).
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

await loadEnv();
await loadCache();

http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/api/songinfo") return handleSongInfo(req, url, res);
  return handleStatic(url, res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Song Sorter at http://127.0.0.1:${PORT}/`);
  console.log(process.env.GETSONGBPM_API_KEY ? "GetSongBPM key loaded from .env" : "No GetSongBPM key: key/BPM lookups are off");
});
