# Page change report

- Before: http://127.0.0.1:8000/?demo=1 at 2026-10-26T00:45:54.218Z
- After: http://127.0.0.1:8000/?demo=1 at 2026-10-26T01:16:55.877Z
- Song rows: 15 before, 15 after

## Added elements (2)

- `#credit-data` (p): "Key and BPM data from ReccoBeats."
- `#link-reccobeats` (a, testid link-reccobeats): "ReccoBeats"

## Removed elements (2)

- `#credit-getsongbpm` (p): "Key and BPM data from GetSongBPM."
- `#link-getsongbpm` (a, testid link-getsongbpm): "GetSongBPM"

## Changed elements (1)

### `#app-version` (span)

| Field | Before | After |
|---|---|---|
| text | `"v2"` | `"v3"` |

## Suggested test cases

Each change above should get at least one test. Starter ideas:

- New: verify `#credit-data` is present and works as intended.
- New: verify `#link-reccobeats` is present and works as intended.
- Removed: confirm nothing still depends on `#credit-getsongbpm`; retire tests that used it.
- Removed: confirm nothing still depends on `#link-getsongbpm`; retire tests that used it.
- Changed: update checks on `#app-version` for text.
