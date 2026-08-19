import sharp from "sharp";
import { writeFileSync, statSync } from "fs";
for (const f of process.argv.slice(2)) {
  try {
    const before = statSync(f).size;
    const meta = await sharp(f).metadata();
    const out = await sharp(f).webp({ quality: 78, effort: 6, alphaQuality: 90 }).toBuffer();
    const tmp = f + ".opt.webp";
    writeFileSync(tmp, out);
    console.log(JSON.stringify({ name: f.split(/[\\/]/).pop(), w: meta.width, h: meta.height, before, after: out.length, tmp }));
  } catch (e) { console.log(JSON.stringify({ name: f.split(/[\\/]/).pop(), err: e.message })); }
}
