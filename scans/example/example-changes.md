# Page change report

- Before: http://127.0.0.1:8000/?demo=1 at 2026-10-23T01:08:30.701Z
- After: http://127.0.0.1:8000/?demo=1 at 2026-10-26T00:45:54.218Z
- Song rows: 15 before, 15 after

## Added elements (6)

- `#btn-lookup` (button, testid btn-lookup): "Look up key & BPM"
- `#col-key` (th): "Key"
- `#col-bpm` (th): "BPM"
- `#app-footer` (footer)
- `#credit-getsongbpm` (p): "Key and BPM data from GetSongBPM."
- `#link-getsongbpm` (a, testid link-getsongbpm): "GetSongBPM"

## Removed elements (0)

None.

## Changed elements (2)

### `#app-version` (span)

| Field | Before | After |
|---|---|---|
| text | `"v1"` | `"v2"` |

### `#select-sort` (select)

| Field | Before | After |
|---|---|---|
| attr:options | `["added_at=Date added","name=Title","artist=Artist","album=Album","release_date=Release date","duration_ms=Length"]` | `["added_at=Date added","name=Title","artist=Artist","album=Album","release_date=Release date","duration_ms=Length","tempo=BPM","open_key=Key (Open Key)"]` |

## Suggested test cases

Each change above should get at least one test. Starter ideas:

- New: verify `#btn-lookup` is present and works as intended.
- New: verify `#col-key` is present and works as intended.
- New: verify `#col-bpm` is present and works as intended.
- New: verify `#app-footer` is present and works as intended.
- New: verify `#credit-getsongbpm` is present and works as intended.
- New: verify `#link-getsongbpm` is present and works as intended.
- Changed: update checks on `#app-version` for text.
- Changed: update checks on `#select-sort` for attr:options.
