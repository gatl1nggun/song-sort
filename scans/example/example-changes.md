# Page change report

- Before: http://127.0.0.1:8000/?demo=1 at 2026-10-23T01:08:30.701Z
- After: http://127.0.0.1:8000/?demo=1 at 2026-10-23T01:09:17.906Z
- Song rows: 15 before, 15 after

## Added elements (1)

- `#btn-shuffle` (button, testid btn-shuffle): "Shuffle"

## Removed elements (0)

None.

## Changed elements (3)

### `#app-version` (span)

| Field | Before | After |
|---|---|---|
| text | `"v1"` | `"v2"` |

### `#select-sort` (select)

| Field | Before | After |
|---|---|---|
| attr:options | `["added_at=Date added","name=Title","artist=Artist","album=Album","release_date=Release date","duration_ms=Length"]` | `["added_at=Date added","name=Title","artist=Artist","album=Album","release_date=Release date","duration_ms=Length","random=Random"]` |

### `#btn-logout` (button)

| Field | Before | After |
|---|---|---|
| text | `"Start over"` | `"Sign out"` |

## Suggested test cases

Each change above should get at least one test. Starter ideas:

- New: verify `#btn-shuffle` is present and works as intended.
- Changed: update checks on `#app-version` for text.
- Changed: update checks on `#select-sort` for attr:options.
- Changed: update checks on `#btn-logout` for text.
