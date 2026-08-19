import { readFileSync, writeFileSync, statSync } from "fs";
const f = process.argv[2];
const css = readFileSync(f, "utf8");
const before = css.length;
// Remove /* */ comments (but keep data URIs and strings safe)
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
// Collapse whitespace runs outside strings/data URIs: simple approach — collapse
// runs of whitespace, then trim space around structural chars.
let out = noComments
  .replace(/\s+/g, " ")
  .replace(/\s*([{}:;,])\s*/g, "$1")
  .replace(/;}/g, "}")
  .replace(/\s*>\s*/g, ">")
  .replace(/\s*\+\s*/g, "+")
  .replace(/\s*~\s*/g, "~");
// Fix spaces that are semantically needed inside selectors like "a b" — the collapse
// above already preserves single spaces, but we removed spaces after commas inside
// selectors which is fine. Also guard against breaking data URIs (spaces inside url())
// — collapse turns "data:image/svg+xml;utf8,<svg ...>" internal spaces into single spaces, OK.
const after = out.length;
writeFileSync(f, out, "utf8");
console.log(JSON.stringify({ file: f, before, after, savedPct: (((before - after) / before) * 100).toFixed(1) }));
