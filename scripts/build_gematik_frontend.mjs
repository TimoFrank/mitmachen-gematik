import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadReleaseConfig } from "./lib/release_policy.mjs";
import { artifactDigest, artifactFiles } from "./lib/artifact-tree.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const options = {};
while (args.length) {
  const key = args.shift();
  if (!["--output", "--api-base-url"].includes(key) || !args.length || options[key]) {
    throw new Error("Erwartet werden --output und --api-base-url genau einmal.");
  }
  options[key] = args.shift();
}
if (!options["--output"] || !options["--api-base-url"]) throw new Error("Ausgabepfad und API-Origin fehlen.");
const origin = new URL(options["--api-base-url"]);
if (origin.protocol !== "https:" || origin.username || origin.password || origin.origin !== options["--api-base-url"]
    || /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(origin.hostname)) {
  throw new Error("Der Target-Origin muss ein externer kanonischer HTTPS-Origin sein.");
}
const dist = path.join(root, "dist");
const output = path.resolve(root, options["--output"]);
if (!output.startsWith(`${dist}${path.sep}`)) throw new Error("Die Buildausgabe muss unter dist liegen.");
let current = root;
for (const part of path.relative(root, output).split(path.sep)) {
  current = path.join(current, part);
  if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("Symlinks im Ausgabepfad sind nicht erlaubt.");
}
mkdirSync(dist, { recursive: true });
const stage = mkdtempSync(path.join(dist, ".gematik-core-frontend-"));
function copy(source, destination = path.basename(source)) {
  const from = path.join(root, source);
  if (!existsSync(from) || lstatSync(from).isSymbolicLink()) throw new Error(`Buildquelle fehlt oder ist ein Symlink: ${source}`);
  const to = path.join(stage, destination);
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, dereference: false });
}
function rewrite(file, replacements) {
  const target = path.join(stage, file);
  let source = readFileSync(target, "utf8");
  for (const [pattern, replacement] of replacements) source = source.replace(pattern, replacement);
  writeFileSync(target, source);
}
try {
  for (const file of ["versorgungs-kompass.html", "versorgungs-kompass.css", "versorgungs-kompass-no-script.css", "versorgungs-kompass.js", "versorgungs-kompass-routes.js"]) copy(`frontend/app/${file}`);
  copy("frontend/app/hospitation", "hospitation");
  for (const file of ["runtime-config.js", "sector-registry.js", "hospitation-model.js", "hospitation-export.js", "activity-model.js", "document-text-extractor.js", "data-service.js"]) copy(`frontend/data/${file}`, `data/${file}`);
  for (const file of ["login.html", "login.css", "auth-config.js", "auth-guard.js", "auth-login.js"]) copy(`frontend/login/${file}`);
  for (const stem of ["versorgungs-kompass-map", "versorgungs-kompass-map-teaser", "versorgungs-kompass-contact-mini-map"]) {
    for (const extension of ["html", "css", "js"]) copy(`frontend/map/${stem}.${extension}`);
  }
  copy("frontend/map/state-flags", "state-flags");
  copy("frontend/map/data", "deutschlandkarte-project/data");
  rmSync(path.join(stage, "deutschlandkarte-project/data/constituency-polygons.js"), { force: true });
  copy("frontend/vendor", "vendor");
  copy("public/brand/versorgungs-kompass", "public/brand/versorgungs-kompass");
  copy("public/brand/mitmachen", "public/brand/mitmachen");
  copy("public/brand/modules", "public/brand/modules");
  copy("public/brand/gematik", "public/brand/gematik");
  copy("public/hospitation", "public/hospitation");
  copy("public/manifest.webmanifest", "manifest.webmanifest");

  for (const file of ["versorgungs-kompass.html", "versorgungs-kompass.js"]) rewrite(file, [
    [/\.\.\/login\/auth-/g, "./auth-"], [/\.\.\/map\/versorgungs-kompass-/g, "./versorgungs-kompass-"],
    [/\.\.\/map\/data\//g, "./deutschlandkarte-project/data/"], [/\.\.\/data\//g, "./data/"],
    [/\.\.\/vendor\//g, "./vendor/"], [/\.\.\/login\/login\.html/g, "./login.html"],
    [/\.\.\/\.\.\/public\//g, "./public/"]
  ]);
  rewrite("versorgungs-kompass.html", [
    [/<script\b[^>]*src="[^"\n]*constituency-polygons\.js"[^>]*><\/script>\s*/g, ""],
    [/<link\b[^>]*href="\.\/user-administration\.css"[^>]*>\s*/g, ""],
    [/<script\b[^>]*src="\.\/user-administration\.js"[^>]*><\/script>\s*/g, ""],
    [/<body\b([^>]*)>/i, '<body$1 data-product-scope="gematik-core">'],
    [/\.\.\/public\/manifest\.webmanifest/g, "./manifest.webmanifest"],
    [/\.\/public\/manifest\.webmanifest/g, "./manifest.webmanifest"],
    [/(href|src)="\.\//g, '$1="/']
  ]);
  for (const file of ["hospitation/index.html", "hospitation/import.html"]) rewrite(file, [
    [/\.\.\/\.\.\/login\/auth-/g, "../auth-"], [/\.\.\/\.\.\/data\//g, "../data/"],
    [/\.\.\/versorgungs-kompass\.html/g, "../versorgungs-kompass.html"],
    [/\.\.\/\.\.\/\.\.\/public\//g, "../public/"], [/\.\.\/\.\.\/public\/manifest\.webmanifest/g, "../manifest.webmanifest"]
  ]);
  rewrite("login.html", [
    [/\.\.\/app\/versorgungs-kompass-routes\.js/g, "./versorgungs-kompass-routes.js"],
    [/\.\.\/app\/versorgungs-kompass\.html/g, "./versorgungs-kompass.html"], [/\.\.\/data\//g, "./data/"],
    [/\.\.\/vendor\//g, "./vendor/"], [/\.\.\/\.\.\/public\/brand\//g, "./public/brand/"],
    [/\.\.\/\.\.\/public\/manifest\.webmanifest/g, "./manifest.webmanifest"], [/\.\.\/public\/manifest\.webmanifest/g, "./manifest.webmanifest"]
  ]);
  for (const file of ["versorgungs-kompass-map.html", "versorgungs-kompass-map-teaser.html", "versorgungs-kompass-contact-mini-map.html"]) rewrite(file, [
    [/\.\.\/login\/auth-/g, "./auth-"], [/\.\.\/\.\.\/public\//g, "./public/"],
    [/\.\.\/public\//g, "./public/"], [/\.\.\/vendor\//g, "./vendor/"],
    [/\.\.\/data\//g, "__ROOT_DATA__/"], [/\.\/data\//g, "./deutschlandkarte-project/data/"], [/__ROOT_DATA__\//g, "./data/"]
  ]);
  rewrite("auth-config.js", [[/loginPath: "\.\.\/login\/login\.html"/, 'loginPath: "/login.html"'], [/defaultPath: "\.\.\/app\/versorgungs-kompass\.html"/, 'defaultPath: "/versorgung"']]);
  rewrite("manifest.webmanifest", [[/"start_url": "[^"]+"/, '"start_url": "/versorgung"'], [/"scope": "[^"]+"/, '"scope": "/"'], [/"src": "\.\/brand\//g, '"src": "./public/brand/']]);
  const entry = '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=/versorgung"><title>Versorgungs-Kompass</title></head><body><a href="/versorgung">Anwendung öffnen</a></body></html>\n';
  writeFileSync(path.join(stage, "index.html"), entry);
  writeFileSync(path.join(stage, "public-index.html"), entry);
  execFileSync(process.execPath, [path.join(root, "scripts/prepare_target_frontend_config.mjs"), path.join(stage, "data/runtime-config.js"), origin.origin, "api", "oidc"], { stdio: "inherit" });
  let revision = "unknown";
  try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch {}
  rewrite("versorgungs-kompass.html", [[/(\b(?:src|href)=["'])([^"'?#]+?\.(?:css|m?js))(["'])/gi, (match, prefix, asset, suffix) => asset.endsWith("versorgungs-kompass-no-script.css") ? match : `${prefix}${asset}?v=${revision}${suffix}`]]);
  // Verzeichnisprüfung verweigert auch Symlinks aus rekursiv kopierten Quellen.
  artifactFiles(stage);
  writeFileSync(path.join(stage, "build-manifest.json"), `${JSON.stringify({ profile: "target", productVersion: loadReleaseConfig(root).productVersion, revision, artifactDigest: artifactDigest(stage) }, null, 2)}\n`);
  mkdirSync(path.dirname(output), { recursive: true });
  rmSync(output, { recursive: true, force: true });
  renameSync(stage, output);
  console.log(`Gematik-Kernfrontend gebaut: ${path.relative(root, output)}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
