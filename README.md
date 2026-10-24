# Song Sorter

A small webpage that shows your Spotify Liked Songs and lets you search, sort
and filter them. It is built as a **test target** for Tosca or Playwright:
every control has a stable `id` and `data-testid`, and every song row has the
id `song-row-<spotifyTrackId>`, so scans stay comparable between versions.

It also runs fully offline with made-up **demo data**, so you can practise
scanning before Spotify is set up at all.

## Run it

Needs Node 18+ (no build step).

```bash
npm install                    # only needed for the Playwright scan scripts
npx playwright install chromium # first time only, downloads the browser
npm run serve                  # http://127.0.0.1:8000/
```

Open `http://127.0.0.1:8000/` and click **Use demo data**, or open
`http://127.0.0.1:8000/?demo=1` to skip straight to the song list.

Use `127.0.0.1`, not `localhost`. Spotify rejects `localhost` redirect URIs.

## Connect real Spotify data (optional)

What Spotify requires as of October 2026 (Development Mode apps):

- The **app owner needs Spotify Premium**. If Premium lapses, the app stops working.
- Up to **5 users**, and each must be added by email under *User Management*
  in the app's dashboard. Your own account is the only one you need.
- Redirect URI must be `http://127.0.0.1:8000/` (HTTP is allowed only for
  loopback IPs; `localhost` is not allowed).
- Up to 25 Client IDs per developer account, sharing one quota.
- Several fields were removed for Dev Mode apps (track/album/artist
  `popularity`, `followers`, batch `GET /tracks`, and more). This app only
  uses `GET /v1/me/tracks`, which is still available, and the fields it
  reads (name, artists, album name, release date, duration, explicit, added date).

Steps:

1. Go to <https://developer.spotify.com/dashboard>, create an app, tick **Web API**.
2. Add redirect URI `http://127.0.0.1:8000/`.
3. Copy the **Client ID** (no client secret is used: the page uses PKCE).
4. In the page, paste the Client ID and click **Connect to Spotify**.

The page reads at most 500 songs and only asks for the `user-library-read`
scope. The access token is kept in `sessionStorage` and never leaves your browser
except to call Spotify.

## Scan, change, rescan, diff (Playwright)

```bash
npm run serve                                   # terminal 1
npm run scan -- "http://127.0.0.1:8000/?demo=1" scans/before.json
# ...edit the page (see ideas below)...
npm run scan -- "http://127.0.0.1:8000/?demo=1" scans/after.json
npm run diff -- scans/before.json scans/after.json scans/changes.md
```

`scan` records every element with an id or `data-testid`: tag, text,
visibility and key attributes (including `<select>` options). `diff` writes a
Markdown report of added, removed and changed elements plus a starter list of
test cases. See `scans/example/` for a real run where v2 added a Shuffle
button, a Random sort option, and renamed "Start over" to "Sign out".

## Doing the same in Tosca

The page is set up so Tosca's XScan can pick controls by id:

1. Serve the page and open `http://127.0.0.1:8000/?demo=1` in the browser Tosca drives.
2. XScan the page and save the module (use **id** as the identification
   property; it's stable on every control).
3. Make a change, then **rescan** the same module. Tosca will flag controls it
   can no longer find and let you add new ones, which is your change record.
4. Build TestCases from the modules (sort, search, filter, empty state).

The Playwright scripts are the fallback if the work licence won't run at home,
and they give a second, independent record to compare against Tosca's.

## Stable ids worth knowing

| Area | ids |
|---|---|
| Connect | `btn-demo`, `input-client-id`, `btn-connect`, `redirect-uri` |
| Toolbar | `input-search`, `select-sort`, `btn-sort-direction` (`data-direction`), `chk-hide-explicit`, `btn-logout` |
| Results | `song-count`, `songs-table`, `songs-body`, `song-row-<id>`, `empty-message`, `status-message` |
| Row cells (`data-testid`) | `song-index`, `song-name`, `song-explicit`, `song-artist`, `song-album`, `song-release`, `song-duration`, `song-added` |

## Starter test cases (demo data)

| # | Steps | Expected |
|---|---|---|
| 1 | Open `/`, click Use demo data | `#song-count` = "Showing 15 of 15 songs" |
| 2 | Default view | First row is "Neon Harbor" (newest added) |
| 3 | Sort by Title, click direction to Ascending | First three: Afterglow Arcade, Brass Weather, Concrete Lullaby |
| 4 | Sort by Length, Ascending | First row "Level Select" (2:25) |
| 5 | Search "juniper" | 3 songs shown |
| 6 | Search "zzz" | `#empty-message` visible, table hidden |
| 7 | Tick Hide explicit | 12 of 15 shown, no `song-explicit` badges |
| 8 | Click Start over | Connect panel visible again |
| 9 | Enter "bad" as Client ID, Connect | Error in `#status-message` |

## Change ideas for v2 practice

- Add a Shuffle button or a "Random" sort option.
- Rename a button or column header.
- Add a "Group by artist" view or an artist dropdown filter.
- Remove the album column on small screens only (visibility change).
- Add paging (25 songs per page).
- Bump `APP_VERSION` in `app.js` each time so scans show which version they saw.
