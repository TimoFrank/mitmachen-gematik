import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import htmlMetadataTags from "./html_metadata_tags.cjs";

const { parseHtmlAttributes, scanHtmlStartTags } = htmlMetadataTags;

const root = process.cwd();
const productVersion = JSON.parse(fs.readFileSync(path.join(root, "config/release.json"), "utf8")).productVersion;
assert.ok(process.argv.slice(2).every(argument => argument === "--oidc-only"), "Nur --oidc-only ist als Option zulässig.");
const distRoot = path.join(root, "dist");
fs.mkdirSync(distRoot, { recursive: true });
const fixtureRoot = fs.mkdtempSync(path.join(distRoot, ".deployment-separation-test-"));
const builder = path.join(root, "scripts", "build_static_frontend.sh");
const targetAudit = path.join(root, "scripts", "audit_target_assets.mjs");
const apiBaseUrl = "https://gateway.core.example.invalid";
const identityPlatformApiKey = `AIza${"A".repeat(35)}`;
const identityPlatformProjectId = "synthetic-core-identity";

const quotedGreaterThanTag = scanHtmlStartTags(
  '<head><meta content="Wrong>Preview" property=og:title></head>',
  ["meta"]
);
assert.equal(quotedGreaterThanTag.length, 1, "Der Metadaten-Scanner darf nicht an > innerhalb von Quotes abbrechen");
assert.equal(parseHtmlAttributes(quotedGreaterThanTag[0]).values.content, "Wrong>Preview");

const duplicateAttributeTag = parseHtmlAttributes('<meta property="og:title" property="not-share" content="Wrong">');
assert.equal(duplicateAttributeTag.values.property, "og:title", "Attributparsing muss wie der Browser den ersten Wert behalten");
assert.deepEqual(duplicateAttributeTag.duplicateNames, ["property"]);

const encodedStructuralTag = parseHtmlAttributes('<meta property="og&#58;title" content="Wrong">');
assert.deepEqual(
  encodedStructuralTag.structuralCharacterReferenceNames,
  ["property"],
  "Zeichenreferenzen in strukturellen Metadaten-Attributen muessen fail-closed markiert werden"
);

function build(...args) {
  execFileSync("bash", [builder, ...args], { cwd: root, encoding: "utf8", stdio: "pipe" });
}


function rejected(...args) {
  return spawnSync("bash", [builder, ...args], { cwd: root, encoding: "utf8" });
}


function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return filesUnder(fullPath);
      return entry.isFile() ? [fullPath] : [];
    })
    .sort();
}

function relativeFiles(directory) {
  return filesUnder(directory).map((file) => path.relative(directory, file));
}

function fingerprint(directory, { excludeManifest = false } = {}) {
  const hash = createHash("sha256");
  const files = relativeFiles(directory).filter((file) => !excludeManifest || file !== "build-manifest.json");
  const lengthPrefix = (value) => {
    const frame = Buffer.alloc(8);
    frame.writeBigUInt64BE(BigInt(value));
    return frame;
  };
  hash.update(Buffer.from("versorgungs-kompass-artifact-tree-v2\0", "utf8"));
  hash.update(lengthPrefix(files.length));
  for (const relative of files) {
    const normalizedPath = Buffer.from(relative.split(path.sep).join("/"), "utf8");
    const content = fs.readFileSync(path.join(directory, relative));
    hash.update(lengthPrefix(normalizedPath.length));
    hash.update(normalizedPath);
    hash.update(lengthPrefix(content.length));
    hash.update(content);
  }
  return hash.digest("hex");
}

function textArtifact(directory) {
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".webmanifest"]);
  return filesUnder(directory)
    .filter((file) => textExtensions.has(path.extname(file)))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

function assertMissing(directory, ...relativePaths) {
  for (const relativePath of relativePaths) {
    assert.equal(fs.existsSync(path.join(directory, relativePath)), false, `${path.basename(directory)}/${relativePath} muss fehlen`);
  }
}


function testGematikCore() {
  const coreDir = path.join(fixtureRoot, "gematik-core");
  const buildCore = () => build(
    "--profile", "target", "--output", coreDir,
    "--api-base-url", apiBaseUrl, "--auth-mode", "oidc"
  );
  const auditCore = () => spawnSync(process.execPath, [targetAudit, "--artifact-root", coreDir], {
    cwd: root, encoding: "utf8"
  });
  const assertCoreAccepted = () => {
    const result = auditCore();
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  };
  const refreshManifest = () => {
    const file = path.join(coreDir, "build-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    manifest.artifactDigest = `sha256:${fingerprint(coreDir, { excludeManifest: true })}`;
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  };
  buildCore();
  assertCoreAccepted();
  const firstFingerprint = fingerprint(coreDir);
  buildCore();
  assert.equal(fingerprint(coreDir), firstFingerprint, "Identische OIDC-Kernbuilds müssen inhaltsgleich sein");

  const config = fs.readFileSync(path.join(coreDir, "data/runtime-config.js"), "utf8");
  assert.match(config, /productScope:\s*"gematik-core"/);
  assert.match(config, /dataMode:\s*"api"/);
  assert.match(config, /authMode:\s*"oidc"/);
  assert.match(config, /requireApiGateway:\s*true/);
  assert.match(config, /apiCredentials:\s*"include"/);
  assert.equal(/apiBaseUrl:\s*"([^"]+)"/.exec(config)?.[1], apiBaseUrl);
  assert.doesNotMatch(config, /supabaseUrl|supabaseAnonKey|registrationEndpoint|allDemoContactsInvitable:\s*true/);
  const app = fs.readFileSync(path.join(coreDir, "versorgungs-kompass.html"), "utf8");
  assert.match(app, /<body\b[^>]*data-product-scope="gematik-core"/);
  assert.doesNotMatch(app, /data\/(?:public-politics-directory|demo-data|expertenkreis-data|stakeholder-data|patienten-data)\.js/i);
  for (const entry of ["index.html", "public-index.html"]) {
    const html = fs.readFileSync(path.join(coreDir, entry), "utf8");
    assert.match(html, /http-equiv="refresh" content="0; url=\/versorgung"/);
    assert.doesNotMatch(html, /<script\b|<form\b|<iframe\b|<input\b|data-public-entry|https?:\/\//i);
  }
  assertMissing(coreDir,
    "mitmachen", "demo", "public/auth", "public/media/demo", "politik-offline.html",
    "data/public-politics-directory.js", "data/demo-data.js", "data/demo-api.js",
    "data/stakeholder-data.js", "data/patienten-data.js", "data/expertenkreis-data.js",
    "vendor/supabase", "enrollment.html", "enrollment.js", "enrollment.css"
  );
  for (const relative of [
    "public/brand/versorgungs-kompass/mark.svg",
    "public/brand/modules/hospitation/mark.svg",
    "hospitation/import.html", "hospitation/hospitation-synthesis.js",
    "data/data-service.js", "vendor/leaflet/leaflet.js", "vendor/xlsx/xlsx.bundle.js"
  ]) assert.ok(fs.existsSync(path.join(coreDir, relative)), `Benötigte Kerndatei fehlt: ${relative}`);

  const coreText = textArtifact(coreDir);
  assert.doesNotMatch(coreText, /synthetic-core-identity|firebaseapp\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|\b(?:IDENTITY_PLATFORM|IAP_GCIP|IAP_EXTERNAL_AUTH_API_KEY)\b|AIza[0-9A-Za-z_-]{35}/i,
    "Das OIDC-Kernartefakt darf keine persönliche Google-Identitätskonfiguration enthalten");
  assert.doesNotMatch(coreText, /VERSORGUNGS_COMPASS_PUBLIC_POLITICS_DIRECTORY|https:\/\/[a-z0-9-]+\.supabase\.co|@supabase\/supabase-js|supabase-js@/i);
  assert.doesNotMatch(coreText, /https:\/\/timofrank\.github\.io\/mitmachen\/public\/media\/social\//i);
  const manifest = JSON.parse(fs.readFileSync(path.join(coreDir, "build-manifest.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["artifactDigest", "productVersion", "profile", "revision"]);
  assert.equal(manifest.profile, "target");
  assert.equal(manifest.productVersion, productVersion);
  assert.match(manifest.revision, /^[a-f0-9]{40,64}$/);
  assert.equal(manifest.artifactDigest, `sha256:${fingerprint(coreDir, { excludeManifest: true })}`);

  // Die Manipulation erhält einen passenden Inhaltsdigest. Damit muss jeweils
  // die fachliche Artefaktgrenze und nicht nur die Hashprüfung ablehnen.
  for (const [relative, content, label] of [
    ["public/auth/portal-config.js", 'window.IDENTITY_PORTAL_CONFIG = { projectId: "synthetic-core-identity" };\n', "injiziertes Google-Portal"],
    ["nested/politik-offline.html", "<!doctype html><title>Unzulässige Offline-Kopie</title>\n", "verschachtelte Politik-Kopie"],
    ["data/demo-data.js", "window.VERSORGUNGS_COMPASS_DEMO_DATA = {};\n", "Demo-Datensatz"],
    ["mitmachen/versorgungs-netzwerk.html", "<!doctype html><form></form>\n", "öffentliche Registrierung"]
  ]) {
    const target = path.join(coreDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    refreshManifest();
    assert.notEqual(auditCore().status, 0, `OIDC-Kernaudit muss ${label} ablehnen`);
    buildCore();
  }
  for (const [relative, marker, label] of [
    ["versorgungs-kompass.html", '<script src="/data/public-politics-directory.js"></script>', "Referenz auf öffentliche Politikdaten"],
    ["data/data-service.js", 'localStorage.setItem("contacts", "[]");', "lokale Fachdatenhaltung"],
    ["public-index.html", '<script src="/registration.js"></script>', "öffentliche Einstiegslaufzeit"]
  ]) {
    const target = path.join(coreDir, relative);
    fs.appendFileSync(target, `\n${marker}\n`);
    refreshManifest();
    assert.notEqual(auditCore().status, 0, `OIDC-Kernaudit muss ${label} ablehnen`);
    buildCore();
  }
  assertCoreAccepted();
  const invalidApi = rejected("--profile", "target", "--output", path.join(fixtureRoot, "core-invalid-origin"), "--api-base-url", `${apiBaseUrl}/api`, "--auth-mode", "oidc");
  assert.notEqual(invalidApi.status, 0, "OIDC-Kernbuild muss einen API-Pfad als Origin ablehnen");
  const oidcWithPortal = rejected("--profile", "target", "--output", path.join(fixtureRoot, "core-with-portal"), "--api-base-url", apiBaseUrl, "--auth-mode", "oidc", "--identity-platform-api-key", identityPlatformApiKey, "--identity-platform-project-id", identityPlatformProjectId);
  assert.notEqual(oidcWithPortal.status, 0, "OIDC-Kernbuild muss private Portalwerte ablehnen");
}


try {
  testGematikCore();
  console.log("Deployment separation test OK (OIDC-Kern): Funktionsumfang, Daten, Identität und Artefakte sind getrennt geprüft.");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
