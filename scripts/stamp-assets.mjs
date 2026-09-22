import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const publicDir = join(root, "public");

function hashFile(path) {
  return createHash("sha1").update(readFileSync(path)).digest("hex").slice(0, 10);
}

function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walkHtml(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

const cssHash = hashFile(join(publicDir, "css/site.css"));
const jsHash = hashFile(join(publicDir, "js/challenge.js"));

const htmlFiles = walkHtml(publicDir);
for (const file of htmlFiles) {
  let html = readFileSync(file, "utf8");
  const next = html
    .replace(/\/css\/site\.css(?:\?v=[^"']*)?/g, `/css/site.css?v=${cssHash}`)
    .replace(/\/js\/challenge\.js(?:\?v=[^"']*)?/g, `/js/challenge.js?v=${jsHash}`);
  if (next !== html) {
    writeFileSync(file, next);
    console.log(`stamped ${relative(root, file)}`);
  }
}

console.log(`asset stamps css=${cssHash} js=${jsHash}`);
