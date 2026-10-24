// Compares two scan snapshots and writes a Markdown change report.
// Usage: node scan/diff.mjs <before.json> <after.json> [report.md]
import { readFile, writeFile } from "node:fs/promises";

const [beforePath, afterPath, outPath = "scans/changes.md"] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("Usage: node scan/diff.mjs <before.json> <after.json> [report.md]");
  process.exit(1);
}

const load = async (p) => JSON.parse(await readFile(p, "utf8"));
const before = await load(beforePath);
const after = await load(afterPath);

// Only id'd elements are compared one to one; repeated rows are compared by count.
const byId = (snap) => new Map(snap.elements.filter((e) => e.id && !e.id.startsWith("song-row-")).map((e) => [e.id, e]));
const b = byId(before);
const a = byId(after);

const added = [...a.keys()].filter((k) => !b.has(k));
const removed = [...b.keys()].filter((k) => !a.has(k));
const changed = [];
for (const [id, el] of a) {
  const old = b.get(id);
  if (!old) continue;
  const diffs = [];
  for (const f of ["tag", "text", "visible", "testid"]) {
    if (JSON.stringify(old[f]) !== JSON.stringify(el[f])) diffs.push({ field: f, from: old[f], to: el[f] });
  }
  const keys = new Set([...Object.keys(old.attrs), ...Object.keys(el.attrs)]);
  for (const k of keys) {
    if (JSON.stringify(old.attrs[k]) !== JSON.stringify(el.attrs[k])) diffs.push({ field: `attr:${k}`, from: old.attrs[k], to: el.attrs[k] });
  }
  if (diffs.length) changed.push({ id, tag: el.tag, diffs });
}

const rows = (snap) => snap.elements.filter((e) => e.testid === "song-row").length;
const fmt = (v) => (v === undefined || v === null ? "_(none)_" : `\`${JSON.stringify(v)}\``);
const describe = (el) => `- \`#${el.id}\` (${el.tag}${el.testid ? `, testid ${el.testid}` : ""})${el.text ? `: "${el.text}"` : ""}`;

const lines = [
  "# Page change report",
  "",
  `- Before: ${before.url} at ${before.scannedAt}`,
  `- After: ${after.url} at ${after.scannedAt}`,
  `- Song rows: ${rows(before)} before, ${rows(after)} after`,
  "",
  `## Added elements (${added.length})`, "",
  ...(added.length ? added.map((k) => describe(a.get(k))) : ["None."]), "",
  `## Removed elements (${removed.length})`, "",
  ...(removed.length ? removed.map((k) => describe(b.get(k))) : ["None."]), "",
  `## Changed elements (${changed.length})`, "",
];
if (!changed.length) lines.push("None.");
for (const c of changed) {
  lines.push(`### \`#${c.id}\` (${c.tag})`, "", "| Field | Before | After |", "|---|---|---|");
  for (const d of c.diffs) lines.push(`| ${d.field} | ${fmt(d.from)} | ${fmt(d.to)} |`);
  lines.push("");
}
lines.push("## Suggested test cases", "", "Each change above should get at least one test. Starter ideas:", "");
for (const k of added) lines.push(`- New: verify \`#${k}\` is present and works as intended.`);
for (const k of removed) lines.push(`- Removed: confirm nothing still depends on \`#${k}\`; retire tests that used it.`);
for (const c of changed) lines.push(`- Changed: update checks on \`#${c.id}\` for ${c.diffs.map((d) => d.field).join(", ")}.`);

await writeFile(outPath, lines.join("\n") + "\n");
console.log(`Report: ${outPath} (${added.length} added, ${removed.length} removed, ${changed.length} changed)`);
