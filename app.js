// Song Sorter: loads Liked Songs from the Spotify Web API (or demo data)
// and lets you search and sort them. Plain JS, no build step.
//
// Auth is Authorization Code with PKCE, so no client secret is needed.
// Only the user-library-read scope is requested.
//
// Key and BPM come from GetSongBPM through the local server (scan/serve.mjs),
// which holds the API key. The page sends it only a song's title and artist.

const APP_VERSION = "v2";
const SCOPES = "user-library-read";
const MAX_SONGS = 500; // keeps us well inside Development Mode quotas
const STORAGE = {
  clientId: "songsorter.clientId",
  verifier: "songsorter.verifier",
  token: "songsorter.token",
};

const REDIRECT_URI = window.location.origin + window.location.pathname;

const state = {
  songs: [],
  sortKey: "added_at",
  direction: "desc",
  search: "",
  hideExplicit: false,
  source: null,       // "demo" or "spotify"
  info: new Map(),    // song id -> { key, open_key, tempo } or null when not found
  lookingUp: false,
};

const $ = (id) => document.getElementById(id);

// ---------- UI helpers ----------

function setStatus(text, isError = false) {
  const el = $("status-message");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function showSongsPanel(show) {
  $("connect-panel").hidden = show;
  $("songs-panel").hidden = !show;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// GetSongBPM uses Open Key notation: "1m" (A minor) .. "12d". Minor keys sort
// just before the major key on the same number, so wheel order is kept.
function openKeyRank(openKey) {
  const m = /^(\d{1,2})([dm])$/i.exec(openKey || "");
  return m ? Number(m[1]) + (m[2].toLowerCase() === "d" ? 0.5 : 0) : null;
}

function sortValue(song, key) {
  if (key === "tempo") return state.info.get(song.id)?.tempo ?? null;
  if (key === "open_key") return openKeyRank(state.info.get(song.id)?.open_key);
  const v = song[key];
  return typeof v === "string" ? v.toLowerCase() : v;
}

function visibleSongs() {
  const q = state.search.trim().toLowerCase();
  const filtered = state.songs.filter((song) => {
    if (state.hideExplicit && song.explicit) return false;
    if (!q) return true;
    return [song.name, song.artist, song.album].some((f) => f.toLowerCase().includes(q));
  });
  const dir = state.direction === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    const av = sortValue(a, state.sortKey);
    const bv = sortValue(b, state.sortKey);
    // Songs without a key/BPM go last in either direction.
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return a.id < b.id ? -1 : 1; // stable tie-break so scans are repeatable
  });
}

function cell(tr, className, text, testId) {
  const td = document.createElement("td");
  td.className = className;
  td.dataset.testid = testId;
  td.textContent = text;
  tr.appendChild(td);
  return td;
}

function render() {
  const body = $("songs-body");
  body.replaceChildren();
  const songs = visibleSongs();

  songs.forEach((song, i) => {
    const tr = document.createElement("tr");
    tr.id = `song-row-${song.id}`;
    tr.dataset.testid = "song-row";
    tr.dataset.songId = song.id;

    cell(tr, "num col-index", String(i + 1), "song-index");
    const nameTd = cell(tr, "col-name", song.name, "song-name");
    if (song.explicit) {
      const badge = document.createElement("span");
      badge.className = "explicit-badge";
      badge.dataset.testid = "song-explicit";
      badge.textContent = "E";
      badge.title = "Explicit";
      nameTd.appendChild(badge);
    }
    cell(tr, "col-artist", song.artist, "song-artist");
    cell(tr, "col-album", song.album, "song-album");
    cell(tr, "col-release", song.release_date, "song-release");
    cell(tr, "col-duration", formatDuration(song.duration_ms), "song-duration");
    const info = state.info.get(song.id);
    const pending = !state.info.has(song.id);
    cell(tr, "col-key", pending ? "" : info?.key ? `${info.key} (${info.open_key})` : "–", "song-key");
    cell(tr, "col-bpm", pending ? "" : info?.tempo ? String(info.tempo) : "–", "song-bpm");
    cell(tr, "col-added", song.added_at.slice(0, 10), "song-added");
    body.appendChild(tr);
  });

  $("song-count").textContent = `Showing ${songs.length} of ${state.songs.length} songs`;
  $("empty-message").hidden = songs.length > 0;
  $("songs-table").hidden = songs.length === 0;
}

function loadSongs(songs, source) {
  const sourceLabel = source === "demo" ? "demo data" : "Spotify";
  state.songs = songs;
  state.source = source;
  state.info = new Map();
  showSongsPanel(true);
  setStatus(`Loaded ${songs.length} songs from ${sourceLabel}.`);
  render();
}

// ---------- Spotify auth (PKCE) ----------

function randomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function codeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function startLogin() {
  const clientId = $("input-client-id").value.trim();
  if (!/^[0-9a-f]{32}$/i.test(clientId)) {
    setStatus("That doesn't look like a Client ID. It should be 32 letters and numbers.", true);
    return;
  }
  const verifier = randomString(64);
  localStorage.setItem(STORAGE.clientId, clientId);
  localStorage.setItem(STORAGE.verifier, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: await codeChallenge(verifier),
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: localStorage.getItem(STORAGE.clientId),
      code_verifier: localStorage.getItem(STORAGE.verifier),
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const data = await res.json();
  sessionStorage.setItem(STORAGE.token, data.access_token);
  return data.access_token;
}

// ---------- Spotify data ----------

function toSong(item) {
  const t = item.track;
  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    release_date: t.album.release_date,
    duration_ms: t.duration_ms,
    explicit: t.explicit,
    added_at: item.added_at,
  };
}

async function fetchLikedSongs(token) {
  const songs = [];
  let url = "https://api.spotify.com/v1/me/tracks?limit=50";
  while (url && songs.length < MAX_SONGS) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) throw new Error("Spotify session expired. Connect again.");
    if (res.status === 403) throw new Error("Spotify refused access. Is your account added under User Management, and is the app owner on Premium?");
    if (res.status === 429) throw new Error("Spotify rate limit or quota hit. Wait a bit and try again.");
    if (!res.ok) throw new Error(`Spotify request failed (${res.status})`);
    const page = await res.json();
    songs.push(...page.items.filter((i) => i.track && i.track.id).map(toSong));
    setStatus(`Loading songs... ${songs.length}`);
    url = page.next;
  }
  return songs.slice(0, MAX_SONGS);
}

// ---------- Key and BPM (GetSongBPM via local server) ----------

async function fetchSongInfo(song) {
  if (state.source === "demo") return song.demo_info; // offline, no network call
  const params = new URLSearchParams({ title: song.name, artist: song.artist });
  const res = await fetch(`/api/songinfo?${params}`);
  if (res.status === 404) throw new Error("Key/BPM lookup needs the local server. Start it with npm run serve.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Key/BPM lookup failed (${res.status})`);
  return body.found ? { key: body.key, open_key: body.open_key, tempo: body.tempo } : null;
}

async function lookupKeys() {
  if (state.lookingUp) return;
  const todo = state.songs.filter((s) => !state.info.has(s.id));
  if (!todo.length) {
    setStatus("Key and BPM already looked up for every song.");
    return;
  }
  state.lookingUp = true;
  $("btn-lookup").disabled = true;
  let found = 0;
  try {
    for (const [i, song] of todo.entries()) {
      const info = await fetchSongInfo(song);
      state.info.set(song.id, info);
      if (info) found++;
      setStatus(`Looking up key and BPM... ${i + 1} of ${todo.length}`);
      if ((i + 1) % 10 === 0) render();
    }
    setStatus(`Key and BPM found for ${found} of ${todo.length} songs.`);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    state.lookingUp = false;
    $("btn-lookup").disabled = false;
    render();
  }
}

// ---------- Wiring ----------

function resetAll() {
  sessionStorage.removeItem(STORAGE.token);
  state.songs = [];
  state.info = new Map();
  state.source = null;
  state.search = "";
  $("input-search").value = "";
  showSongsPanel(false);
  setStatus("");
}

function bindEvents() {
  $("btn-demo").addEventListener("click", () => loadSongs(window.SAMPLE_SONGS.slice(), "demo"));
  $("btn-lookup").addEventListener("click", lookupKeys);
  $("btn-connect").addEventListener("click", startLogin);
  $("btn-logout").addEventListener("click", resetAll);

  $("input-search").addEventListener("input", (e) => { state.search = e.target.value; render(); });
  $("select-sort").addEventListener("change", (e) => { state.sortKey = e.target.value; render(); });
  $("chk-hide-explicit").addEventListener("change", (e) => { state.hideExplicit = e.target.checked; render(); });
  $("btn-sort-direction").addEventListener("click", (e) => {
    state.direction = state.direction === "asc" ? "desc" : "asc";
    e.target.dataset.direction = state.direction;
    e.target.textContent = state.direction === "asc" ? "Ascending" : "Descending";
    render();
  });
}

async function init() {
  $("app-version").textContent = APP_VERSION;
  $("redirect-uri").textContent = REDIRECT_URI;
  $("input-client-id").value = localStorage.getItem(STORAGE.clientId) || "";
  bindEvents();

  // ?demo=1 skips the connect step, handy for automated scans.
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) {
    loadSongs(window.SAMPLE_SONGS.slice(), "demo");
    return;
  }

  try {
    if (params.has("error")) throw new Error(`Spotify login was cancelled (${params.get("error")}).`);
    let token = sessionStorage.getItem(STORAGE.token);
    if (params.has("code")) {
      setStatus("Finishing Spotify login...");
      token = await exchangeCode(params.get("code"));
      window.history.replaceState({}, "", REDIRECT_URI);
    }
    if (token) loadSongs(await fetchLikedSongs(token), "spotify");
  } catch (err) {
    sessionStorage.removeItem(STORAGE.token);
    showSongsPanel(false);
    setStatus(err.message, true);
  }
}

init();
