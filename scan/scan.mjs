// Scans the page and writes a JSON snapshot of every element that has an id
// or data-testid: tag, text, visibility, and key attributes.
// Usage: node scan/scan.mjs [url] [outfile]
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const url = process.argv[2] || "http://127.0.0.1:8000/?demo=1";
const out = process.argv[3] || `scans/scan-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
await page.waitForLoadState("networkidle");

const elements = await page.evaluate(() => {
  const ATTRS = ["type", "value", "placeholder", "href", "for", "role", "aria-label", "data-direction", "hidden", "disabled"];
  return [...document.querySelectorAll("[id], [data-testid]")].map((el, i) => {
    const attrs = {};
    for (const a of ATTRS) if (el.hasAttribute(a)) attrs[a] = el.getAttribute(a);
    if (el.tagName === "SELECT") attrs.options = [...el.options].map((o) => `${o.value}=${o.text}`);
    return {
      // Prefer id; repeated rows fall back to testid + position.
      key: el.id ? `#${el.id}` : `[data-testid=${el.dataset.testid}]@${i}`,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      testid: el.dataset.testid || null,
      text: (el.children.length === 0 || ["BUTTON", "LABEL", "P", "TD", "TH", "H1", "H2"].includes(el.tagName))
        ? el.textContent.trim().replace(/\s+/g, " ").slice(0, 200) : null,
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      attrs,
    };
  });
});

const snapshot = { url, scannedAt: new Date().toISOString(), title: await page.title(), count: elements.length, elements };
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot, null, 2));
await browser.close();
console.log(`Saved ${elements.length} elements to ${out}`);
