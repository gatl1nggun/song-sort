// Demo songs (made up) so the page works without a Spotify account.
// Same shape app.js builds from the real /v1/me/tracks response.
window.SAMPLE_SONGS = [
  { id: "demo01", name: "Neon Harbor",       artist: "The Quiet Static",  album: "Night Ferry",        release_date: "2019-04-12", duration_ms: 214000, explicit: false, added_at: "2026-10-01T18:22:00Z" },
  { id: "demo02", name: "Paper Satellites",  artist: "Juniper Vale",      album: "Low Orbit",          release_date: "2021-09-03", duration_ms: 187500, explicit: false, added_at: "2026-09-28T09:10:00Z" },
  { id: "demo03", name: "Gravel Road Gospel",artist: "Hollis & The Pines",album: "Dust Bowl Hymns",    release_date: "2015-06-30", duration_ms: 256000, explicit: false, added_at: "2026-09-15T21:45:00Z" },
  { id: "demo04", name: "Static Bloom",      artist: "The Quiet Static",  album: "Night Ferry",        release_date: "2019-04-12", duration_ms: 198000, explicit: true,  added_at: "2026-08-30T14:05:00Z" },
  { id: "demo05", name: "Afterglow Arcade",  artist: "Pixel Tide",        album: "Continue?",          release_date: "2023-02-17", duration_ms: 172000, explicit: false, added_at: "2026-08-11T07:30:00Z" },
  { id: "demo06", name: "Concrete Lullaby",  artist: "MC Lowlight",       album: "Streetlamp Sessions",release_date: "2020-11-20", duration_ms: 223400, explicit: true,  added_at: "2026-07-29T23:59:00Z" },
  { id: "demo07", name: "Brass Weather",     artist: "Ostinato Club",     album: "Forecast",           release_date: "2012-03-08", duration_ms: 301000, explicit: false, added_at: "2026-07-04T12:00:00Z" },
  { id: "demo08", name: "Fold the Map",      artist: "Juniper Vale",      album: "Low Orbit",          release_date: "2021-09-03", duration_ms: 205300, explicit: false, added_at: "2026-06-21T16:40:00Z" },
  { id: "demo09", name: "Velvet Engine",     artist: "Rosa Kestrel",      album: "Overdrive Heart",    release_date: "2018-08-24", duration_ms: 241000, explicit: false, added_at: "2026-06-02T10:15:00Z" },
  { id: "demo10", name: "Ghost Note",        artist: "Ostinato Club",     album: "Forecast",           release_date: "2012-03-08", duration_ms: 158000, explicit: false, added_at: "2026-05-19T19:20:00Z" },
  { id: "demo11", name: "Midnight Recess",   artist: "MC Lowlight",       album: "Streetlamp Sessions",release_date: "2020-11-20", duration_ms: 189000, explicit: true,  added_at: "2026-04-30T08:08:00Z" },
  { id: "demo12", name: "Saltwater Radio",   artist: "Hollis & The Pines",album: "Coastline",          release_date: "2024-05-10", duration_ms: 233000, explicit: false, added_at: "2026-04-02T13:33:00Z" },
  { id: "demo13", name: "Level Select",      artist: "Pixel Tide",        album: "Continue?",          release_date: "2023-02-17", duration_ms: 145000, explicit: false, added_at: "2026-03-14T17:50:00Z" },
  { id: "demo14", name: "Ember Choir",       artist: "Rosa Kestrel",      album: "Overdrive Heart",    release_date: "2018-08-24", duration_ms: 276000, explicit: false, added_at: "2026-02-08T11:11:00Z" },
  { id: "demo15", name: "Small Hours",       artist: "Juniper Vale",      album: "Porchlight",         release_date: "2025-10-31", duration_ms: 219900, explicit: false, added_at: "2026-01-01T00:01:00Z" }
];
