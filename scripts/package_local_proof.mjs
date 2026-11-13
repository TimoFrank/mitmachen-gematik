import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readImportManifest, verifyImportManifest, coreRepository } from "./lib/import-source.mjs";
import { command, docker, fileHash, filesIn, sha256, writeArchive } from "./lib/local-proof-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const options = {};
const args = process.argv.slice(2);
while (args.length) {
  const key = args.shift();
  assert(["--output", "--port"].includes(key) && args.length && !options[key], "Erwartet werden optional --output und --port.");
  options[key] = args.shift();
}
const port = Number(options["--port"] || 4443);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, "Lokaler Port muss zwischen 1024 und 65535 liegen.");
const id = randomUUID();
const outputRoot = path.join(root, "dist", "local-proof");
const archive = path.resolve(root, options["--output"] || `dist/local-proof/gematik-local-proof-${id}.tar.gz`);
assert(archive.startsWith(`${outputRoot}${path.sep}`) && archive.endsWith(".tar.gz") && !existsSync(archive), "Neues tar.gz unter dist/local-proof erforderlich.");
let checked = root;
for (const part of path.relative(root, archive).split(path.sep)) {
  checked = path.join(checked, part);
  assert(!existsSync(checked) || !lstatSync(checked).isSymbolicLink(), "Symlinks im Ausgabepfad sind verboten.");
}
const source = readImportManifest(root);
verifyImportManifest(root, source);
const revision = command("git", ["rev-parse", "HEAD"]).trim();
const dirty = command("git", ["status", "--porcelain=v1", "--untracked-files=all"]).trim().length > 0;
const dirtyHash = dirty ? `sha256:${sha256(Buffer.concat([Buffer.from(source.inventoryDigest), execFileSync("git", ["diff", "HEAD", "--binary", "--no-ext-diff"], { cwd: root })]))}` : null;
const version = JSON.parse(readFileSync(path.join(root, "config/release.json"))).productVersion;
const origin = `https://gematik-proof.localhost:${port}`;
mkdirSync(outputRoot, { recursive: true });
const stage = mkdtempSync(path.join(outputRoot, ".package-"));
let builtImage;
try {
  console.log("Verifiziertes Quellinventar geprüft. Lokale Anwendungsartefakte werden gebaut.");
  command(process.execPath, ["scripts/build_gematik_frontend.mjs", "--output", `dist/local-proof/frontend-${id}`, "--api-base-url", origin]);
  cpSync(path.join(outputRoot, `frontend-${id}`), path.join(stage, "frontend"), { recursive: true });
  command(process.execPath, ["scripts/audit_target_assets.mjs", "--artifact-root", path.join(stage, "frontend")]);
  command(process.execPath, ["scripts/generate_frontend_sbom.mjs", "--output", path.join(stage, "frontend-sbom.cdx.json"), "--artifact-root", path.join(stage, "frontend")]);
  const iid = path.join(outputRoot, `.api-image-${id}`);
  try {
    command("docker", ["build", "-f", "api/Dockerfile", "--iidfile", iid, "--build-arg", `PRODUCT_VERSION=${version}`, "--build-arg", `SOURCE_REVISION=${revision}`, "--build-arg", `SOURCE_URL=${coreRepository}`, "."], undefined, 600000);
    builtImage = readFileSync(iid, "utf8").trim();
  } finally { rmSync(iid, { force: true }); }
  if (spawnSync("docker", ["image", "inspect", "postgres:16-alpine"], { stdio: "ignore" }).status !== 0) docker("pull", "postgres:16-alpine");
  const inspect = reference => {
    const image = JSON.parse(docker("image", "inspect", reference))[0];
    return { imageId: image.Id, repoDigests: image.RepoDigests || [], os: image.Os, architecture: image.Architecture, variant: image.Variant || "" };
  };
  const images = { api: { ...inspect(builtImage), archive: "images/api.tar" }, postgres: { ...inspect("postgres:16-alpine"), archive: "images/postgres.tar" } };
  assert.equal(images.api.os, images.postgres.os); assert.equal(images.api.architecture, images.postgres.architecture);
  mkdirSync(path.join(stage, "images"));
  for (const image of Object.values(images)) docker("save", "--output", path.join(stage, image.archive), image.imageId);
  cpSync(path.join(root, "deploy/postgres/gematik-core"), path.join(stage, "database"), { recursive: true });
  mkdirSync(path.join(stage, "runtime"));
  cpSync(path.join(root, "scripts/lib/local-proof-runtime.mjs"), path.join(stage, "runtime/start.mjs"));
  mkdirSync(path.join(stage, "provenance"));
  writeFileSync(path.join(stage, "provenance/import-manifest.json"), `${JSON.stringify(source, null, 2)}\n`);
  for (const [from, to] of [["LICENSE", "LICENSE"], ["dokumentation/rechtliches/NOTICE.md", "NOTICE.md"], ["dokumentation/rechtliches/DATA_NOTICE.md", "DATA_NOTICE.md"]]) cpSync(path.join(root, from), path.join(stage, to));
  writeFileSync(path.join(stage, "README.md"), `# Lokaler Paketprobelauf\n\nDieses Paket enthält den gebauten gematik-Kern für einen lokalen Test mit ausschließlich fiktiven Daten. Es ist kein freigegebener Release und kein GKE-Deployment.\n\nVoraussetzungen: Docker für ${images.api.os}/${images.api.architecture}, Node.js 22, OpenSSL und shasum für die optionale manuelle Prüfsummenkontrolle. Die beiden benötigten Container-Images sind enthalten. Keine Registry-Anmeldung erforderlich.\n\nNach dem Entpacken im Verzeichnis proof-package:\n\n\`\`\`bash\nshasum -a 256 -c SHA256SUMS\nnode runtime/start.mjs\n\`\`\`\n\nDann ${origin}/__proof/login öffnen. Das kurzlebige Testzertifikat benötigt eine lokale Browserausnahme. Diese Loginroute ist ausschließlich eine synthetische Prüfvorrichtung. Der Gateway lauscht auf 127.0.0.1. Er meldet eine fiktive Testperson an und übergibt echte signierte OIDC-Token an die API. Das prüft keine institutionelle SSO-Anbindung.\n\nDer manuelle Start enthält fiktive Konten und einen leeren Fachbestand. Nur die automatische Paketprüfung legt ihre fiktiven Organisationen, Kontakte, Hospitationen und Beobachtungen über die echte API an.\n\nStrg+C beendet die Umgebung und entfernt Container, Testdaten und temporäre Schlüssel. Keine echten Daten eingeben. Die Datenbank lebt nur im kurzlebigen Testcontainer. Ein Neustart beginnt mit einer leeren synthetischen Datenbank.\n\nFür den automatisierten Nachweis aus dem Quellrepo wird zusätzlich dessen installierter Playwright-Prüfwerkzeugsatz benötigt. Dafür zuerst im Quellrepo npm ci und npx --no-install playwright install chromium ausführen. Der Test entpackt und verifiziert das Archiv vor dem Start. Dieser Werkzeugsatz ist kein Bestandteil der Anwendungslaufzeit.\n`);
  verifyImportManifest(root, readImportManifest(root));
  assert.equal(readImportManifest(root).inventoryDigest, source.inventoryDigest, "Quellen während des Builds verändert. Neu paketieren.");
  const files = await Promise.all(filesIn(stage).map(async file => ({ path: file, sha256: await fileHash(path.join(stage, file)), size: lstatSync(path.join(stage, file)).size })));
  const manifest = {
    schemaVersion: "gematik-local-proof/v1", createdAt: new Date().toISOString(), productVersion: version, productScope: "gematik-core",
    releaseEligible: false, purpose: "Lokaler technischer Paketprobelauf. Keine Betriebsfreigabe.", dataClassification: "synthetic-only",
    sourceRepository: coreRepository, sourceRevision: revision, sourceDirty: dirty, sourceDirtyHash: dirtyHash,
    sourceInventoryDigest: source.inventoryDigest, sourceManifestSha256: await fileHash(path.join(stage, "provenance/import-manifest.json")),
    origin, images, files
  };
  writeFileSync(path.join(stage, "package-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const checksumFiles = [...files.map(file => file.path), "package-manifest.json"].sort();
  writeFileSync(path.join(stage, "SHA256SUMS"), (await Promise.all(checksumFiles.map(async file => `${await fileHash(path.join(stage, file))}  ${file}\n`))).join(""));
  mkdirSync(path.dirname(archive), { recursive: true });
  await writeArchive(stage, archive);
  writeFileSync(`${archive}.sha256`, `${await fileHash(archive)}  ${path.basename(archive)}\n`, { flag: "wx" });
  writeFileSync(path.join(outputRoot, "latest.json"), `${JSON.stringify({ archive: path.relative(root, archive), sourceRevision: revision, sourceInventoryDigest: source.inventoryDigest, releaseEligible: false }, null, 2)}\n`);
  console.log(`Lokales Prüfpaket erzeugt: ${path.relative(root, archive)}`);
} catch (error) { rmSync(archive, { force: true }); rmSync(`${archive}.sha256`, { force: true }); throw error; }
finally {
  rmSync(stage, { recursive: true, force: true });
  rmSync(path.join(outputRoot, `frontend-${id}`), { recursive: true, force: true });
  if (builtImage) spawnSync("docker", ["image", "rm", builtImage], { stdio: "ignore" });
}
