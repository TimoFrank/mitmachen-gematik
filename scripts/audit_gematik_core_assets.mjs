import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artifactDigest, artifactFiles } from "./lib/artifact-tree.mjs";
import { loadReleaseConfig } from "./lib/release_policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const index = args.indexOf("--artifact-root");
const directory = path.resolve(root, index < 0 ? "dist/target" : args[index + 1]);
const files = artifactFiles(directory);
const text = (file) => readFileSync(path.join(directory, file), "utf8");
for (const file of ["build-manifest.json", "index.html", "public-index.html", "login.html", "versorgungs-kompass.html", "versorgungs-kompass.js", "versorgungs-kompass.css", "data/runtime-config.js", "data/data-service.js", "hospitation/import.html", "hospitation/hospitation-synthesis.js", "vendor/THIRD_PARTY_ASSETS.json"]) {
  assert(files.includes(file), `Kernartefakt fehlt: ${file}`);
}
for (const prefix of ["mitmachen/", "demo/", "public/auth/", "public/media/demo/", "public/media/social/", "public/stakeholder-logos/", "vendor/supabase/"]) {
  assert(!files.some((file) => file.startsWith(prefix)), `Nicht freigegebener Target-Bestand: ${prefix}`);
}
for (const file of ["politik-offline.html", "data/public-politics-directory.js", "data/demo-data.js", "data/demo-api.js", "data/stakeholder-data.js", "data/patienten-data.js", "data/expertenkreis-data.js", "enrollment.html"]) {
  assert(!files.some((actual) => actual === file || actual.endsWith(`/${file}`)), `Nicht freigegebene Target-Datei: ${file}`);
}
const config = text("data/runtime-config.js");
assert.match(config, /productScope:\s*"gematik-core"/);
assert.match(config, /dataMode:\s*"api"/);
assert.match(config, /authMode:\s*"oidc"/);
assert.match(config, /requireApiGateway:\s*true/);
assert.match(config, /apiCredentials:\s*"include"/);
for (const capability of ["registrationIntake", "stakeholderOrganizationAssets", "expertOrganizationAssets"]) {
  assert.match(config, new RegExp(`${capability}:\\s*false`));
}
assert.doesNotMatch(config, /supabaseUrl|supabaseAnonKey|registrationEndpoint/);
const origin = /apiBaseUrl:\s*"([^"]+)"/.exec(config)?.[1];
assert(origin && new URL(origin).protocol === "https:" && new URL(origin).origin === origin);
for (const file of ["index.html", "public-index.html"]) {
  assert.match(text(file), /http-equiv="refresh" content="0; url=\/versorgung"/);
  assert.doesNotMatch(text(file), /<script\b|<form\b|<iframe\b|<input\b|https?:\/\//i);
}
const app = text("versorgungs-kompass.html");
assert.match(app, /<body\b[^>]*data-product-scope="gematik-core"/);
assert.doesNotMatch(app, /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>|<style\b|\son[a-z]+\s*=/i);
assert.doesNotMatch(app, /data\/(?:demo-data|public-politics-directory|stakeholder-data|patienten-data|expertenkreis-data)\.js/i);
assert.doesNotMatch(text("data/data-service.js"), /\blocalStorage\b|\bVERSORGUNGS_COMPASS_DEMO_DATA\b|supabaseUrl|supabaseAnonKey/);
const manifest = JSON.parse(text("build-manifest.json"));
assert.deepEqual(Object.keys(manifest).sort(), ["artifactDigest", "productVersion", "profile", "revision"]);
assert.equal(manifest.profile, "target");
assert.equal(manifest.productVersion, loadReleaseConfig(root).productVersion);
assert.match(manifest.revision, /^[a-f0-9]{40,64}$/);
assert.equal(manifest.artifactDigest, artifactDigest(directory), "Der Inhaltsdigest muss den vollständigen ausgelieferten Bestand binden.");
assert(existsSync(path.join(directory, "public/brand/modules/hospitation/mark.svg")));
console.log(`Gematik-Kernartefakt geprüft: ${files.length} Dateien, OIDC, API-Daten und zwei Fachbereiche.`);
