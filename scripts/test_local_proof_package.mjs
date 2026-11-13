import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { command, docker, extractVerifiedPackage, fileHash, filesIn, writeArchive } from "./lib/local-proof-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
let archive, reportDir, selfTest = false;
while (args.length) {
  const value = args.shift();
  if (value === "--self-test") { assert(!selfTest); selfTest = true; }
  else if (value === "--report-dir") { assert(args.length && !reportDir); reportDir = path.resolve(args.shift()); }
  else { assert(!archive && !value.startsWith("--"), "Erwartet werden ein Archivpfad und optional --report-dir."); archive = path.resolve(value); }
}
if (!archive && !selfTest) archive = path.resolve(root, JSON.parse(readFileSync(path.join(root, "dist/local-proof/latest.json"))).archive);
reportDir ||= path.join(root, "dist/local-proof");
mkdirSync(reportDir, { recursive: true });
const basename = archive ? path.basename(archive).replace(/\.tar\.gz$/u, "") : "archive-negative-selftest";
const reportPath = path.join(reportDir, `${basename}-report.json`);
const scratch = mkdtempSync(path.join(tmpdir(), "vk-proof-check-"));
let runtime, browser, packageRoot, activePage;
const counts = { archiveNegative: 0, integrity: 0, api: 0, browser: 0 };
const screenshots = [];
const startedAt = new Date().toISOString();
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); counts.api++; };
async function verifyRuntimeSource(directory) {
  assert.equal(await fileHash(path.join(directory, "runtime/start.mjs")), await fileHash(path.join(root, "scripts/lib/local-proof-runtime.mjs")), "Für die automatische Paketprüfung ist der zum Paket passende Quellcheckout erforderlich. Runtimecode weicht ab.");
}

async function negativeArchives() {
  const fixture = path.join(scratch, "fixture"); mkdirSync(fixture);
  const required = ["frontend/index.html", "frontend/build-manifest.json", "images/api.tar", "images/postgres.tar", "database/schema.sql", "database/runtime-role.sql", "database/grants.sql", "runtime/start.mjs", "README.md", "LICENSE", "NOTICE.md", "DATA_NOTICE.md", "provenance/import-manifest.json"];
  const digest = `sha256:${"a".repeat(64)}`;
  for (const file of required) { mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true }); writeFileSync(path.join(fixture, file), file === "provenance/import-manifest.json" ? JSON.stringify({ inventoryDigest: digest }) : "synthetic fixture\n"); }
  const manifest = { schemaVersion: "gematik-local-proof/v1", releaseEligible: false, dataClassification: "synthetic-only", sourceRevision: "b".repeat(40), sourceDirty: false, sourceDirtyHash: null, sourceInventoryDigest: digest, sourceManifestSha256: await fileHash(path.join(fixture, "provenance/import-manifest.json")), origin: "https://gematik-proof.localhost:4443", images: Object.fromEntries(["api", "postgres"].map(name => [name, { archive: `images/${name}.tar`, imageId: `sha256:${"c".repeat(64)}`, os: "linux", architecture: "amd64" }])), files: await Promise.all(filesIn(fixture).map(async file => ({ path: file, sha256: await fileHash(path.join(fixture, file)), size: lstatSync(path.join(fixture, file)).size }))) };
  writeFileSync(path.join(fixture, "package-manifest.json"), JSON.stringify(manifest));
  writeFileSync(path.join(fixture, "SHA256SUMS"), (await Promise.all(filesIn(fixture).map(async file => `${await fileHash(path.join(fixture, file))}  ${file}\n`))).join(""));
  const fixtureArchive = path.join(scratch, "fixture.tar.gz"); await writeArchive(fixture, fixtureArchive);
  const validFixture = await extractVerifiedPackage(fixtureArchive, path.join(scratch, "valid-fixture"));
  await assert.rejects(verifyRuntimeSource(validFixture.root), /passende Quellcheckout/u); counts.archiveNegative++;
  const tar = gunzipSync(readFileSync(fixtureArchive));
  async function reject(name, mutate, pattern) {
    const changed = Buffer.from(tar); mutate(changed);
    const file = path.join(scratch, `${name}.tar.gz`); writeFileSync(file, gzipSync(changed));
    await assert.rejects(extractVerifiedPackage(file, path.join(scratch, name)), pattern); counts.archiveNegative++;
  }
  const checksum = bytes => { bytes.fill(32, 148, 156); bytes.write(`${bytes.subarray(0, 512).reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0")}\0 `, 148); };
  await reject("traversal", bytes => { bytes.fill(0, 0, 100); bytes.write("../outside"); checksum(bytes); }, /Unsicherer Archivpfad/u);
  await reject("absolute", bytes => { bytes.fill(0, 0, 100); bytes.write("/outside"); checksum(bytes); }, /Unsicherer Archivpfad/u);
  for (const [name, type] of [["symlink", "2"], ["hardlink", "1"], ["device", "3"], ["pax", "x"]]) await reject(name, bytes => { bytes[156] = type.charCodeAt(0); checksum(bytes); }, /Dateitypen/u);
  await reject("header-checksum", bytes => { bytes[0] ^= 1; }, /Headerprüfsumme/u);
  await reject("oversized", bytes => { bytes.write(`${(1024 ** 3 + 1).toString(8).padStart(11, "0")}\0`, 124); checksum(bytes); }, /Einzeldatei/u);
  const dirty = path.join(scratch, "hash-fixture"); cpSync(fixture, dirty, { recursive: true });
  writeFileSync(path.join(dirty, "frontend/index.html"), "tampered fixture\n");
  const dirtyArchive = path.join(scratch, "hash.tar.gz"); await writeArchive(dirty, dirtyArchive);
  await assert.rejects(extractVerifiedPackage(dirtyArchive, path.join(scratch, "hash-result")), /Datei(?:größe|prüfsumme)/u); counts.archiveNegative++;
  const extra = path.join(scratch, "extra-fixture"); cpSync(fixture, extra, { recursive: true }); writeFileSync(path.join(extra, "unexpected.txt"), "synthetic\n");
  const extraArchive = path.join(scratch, "extra.tar.gz"); await writeArchive(extra, extraArchive);
  await assert.rejects(extractVerifiedPackage(extraArchive, path.join(scratch, "extra-result")), /Ungeplanter Archivpfad/u); counts.archiveNegative++;
  rmSync(path.join(extra, "unexpected.txt")); writeFileSync(path.join(extra, "frontend/unexpected.txt"), "synthetic\n");
  const inventoryArchive = path.join(scratch, "inventory.tar.gz"); await writeArchive(extra, inventoryArchive);
  await assert.rejects(extractVerifiedPackage(inventoryArchive, path.join(scratch, "inventory-result")), /Gesamtinventar/u); counts.archiveNegative++;
}

try {
  await negativeArchives();
  if (selfTest) {
    console.log(`Archivschutz erfolgreich: ${counts.archiveNegative} negative Fälle, keine Container gestartet.`);
  } else {
  const archiveSha256 = await fileHash(archive);
  assert.equal(readFileSync(`${archive}.sha256`, "utf8"), `${archiveSha256}  ${path.basename(archive)}\n`, "Äußere Archivprüfsumme weicht ab."); counts.integrity++;
  const extracted = await extractVerifiedPackage(archive, path.join(scratch, "unpacked")); packageRoot = extracted.root; counts.integrity++;
  command(process.execPath, [path.join(root, "scripts/audit_target_assets.mjs"), "--artifact-root", path.join(packageRoot, "frontend")]); counts.integrity++;
  const { manifest } = extracted;
  await verifyRuntimeSource(packageRoot); counts.integrity++;
  const packagedRuntime = await import(pathToFileURL(path.join(packageRoot, "runtime/start.mjs")).href);
  runtime = await packagedRuntime.startRuntime(packageRoot, manifest);
  check(docker("exec", runtime.container, "id", "-u").trim() === "0", false, "API muss ohne Root laufen.");
  const inspection = JSON.parse(docker("inspect", runtime.container))[0];
  check(inspection.HostConfig.ReadonlyRootfs, true, "API muss schreibgeschützt laufen.");
  check((await runtime.request("GET", "/api/session", undefined, "")).status, 401, "Anonymer Zugriff");
  check((await runtime.request("GET", "/api/session", undefined, "admin", { sub: randomUUID() })).status, 403, "Unbekannte Identität");
  check((await runtime.request("GET", "/api/session", undefined, "admin", { aud: "invalid-proof-audience" })).status, 401, "Falsche Audience");
  check((await runtime.request("GET", "/api/session", undefined, "admin", { exp: 1 })).status, 401, "Abgelaufenes Token");
  const session = await runtime.request("GET", "/api/session"); check(session.status, 200, "Echte OIDC-Session"); check(session.body.authMode, "oidc");
  for (const route of ["/api/profiles", "/api/contacts", "/api/organizations", "/api/hospitations", "/api/hospitation-observations", "/api/roadmap-items", "/api/activities", "/api/notifications", "/api/ops/summary", "/api/ops/checks"]) check((await runtime.request("GET", route)).status, 200, route);
  for (const route of ["/api/formats", "/api/formats/test/participants", "/api/expert-contacts", "/api/expert-organizations", "/api/expert-entity-links", "/api/stakeholder-people", "/api/stakeholder-organizations", "/api/politics/health-committee", "/api/connectors/typo3/mitmachen-registrations", "/api/auth/external-enrollment", "/api/admin/users", "/api/mac-sync/snapshot"]) {
    for (const method of ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]) check((await runtime.request(method, route, ["GET", "OPTIONS"].includes(method) ? undefined : {})).status, 404, `Entfernter Pfad ${method} ${route}`);
  }
  check((await runtime.request("POST", "/api/contacts", { name: "Fiktiver Schreibversuch" }, "viewer")).status, 403, "Leser darf nicht schreiben.");
  const organization = await runtime.request("POST", "/api/organizations", { name: "Fiktive Testpraxis", city: "Bonn", sector: "Praxis", lat: 50.7374, lon: 7.0982 }); check(organization.status, 201, "Organisation anlegen");
  const contact = await runtime.request("POST", "/api/contacts", { name: "Fiktive Testperson", city: "Bonn", category: "Praxis", organizationId: organization.body.id, ownerId: runtime.adminId }); check(contact.status, 201, "Kontakt anlegen");
  const hospitationId = randomUUID();
  const hospitation = await runtime.request("POST", "/api/hospitations", { id: hospitationId, contactId: contact.body.id, organizationId: organization.body.id, startsAt: "2027-01-10T09:00:00Z", endsAt: "2027-01-10T10:00:00Z", city: "Bonn", sector: "Praxis", status: "Gebucht" }); check(hospitation.status, 201, "Hospitation anlegen");
  const source = { kind: "plaud_transcript", recordingId: `of_${"a".repeat(32)}`, sha256: "b".repeat(64), segmentStart: 1, segmentEnd: 2, indexBase: 1 };
  const observation = { hospitationId, title: "Fiktive Paketbeobachtung", situation: "Synthetischer Probelauf", description: "Ausschließlich fiktive Beispieldaten", limitations: "Keine Forschungsdaten" };
  const preview = await runtime.request("POST", "/api/hospitation-observations", { mode: "preview", source, observation }); check(preview.status, 200, "Beobachtung vorprüfen");
  check((await runtime.request("POST", "/api/hospitation-observations", { mode: "apply", source, observation, expectedTargetFingerprint: preview.body.targetFingerprint, expectedCandidateFingerprint: preview.body.candidateFingerprint, confirmation: "append-source-observation" })).status, 200, "Beobachtung übernehmen");
  const exported = await runtime.request("GET", "/api/export"); check(exported.status, 200, "Export");
  check(exported.body.data.hospitations.some(row => row.id === hospitationId), true);
  check(exported.body.data.hospitation_observations.length > 0, true);
  check(exported.body.data.identity_bindings, undefined); check(exported.body.data.formats, undefined);
  // Der Smoke prüft den Fachbestand einer eingerichteten Testperson. Der echte
  // API-Schreibpfad ersetzt dafür ausschließlich die fehlende Fixture-Einrichtung.
  const setupCompletedAt = new Date().toISOString();
  check((await runtime.request("PUT", "/api/user-settings", { preferences: { onboarding: { version: 2, completedAt: setupCompletedAt, tourSkippedAt: setupCompletedAt } } })).status, 200, "Testperson über echte API einrichten");
  browser = await chromium.launch({ headless: true, args: ["--host-resolver-rules=MAP gematik-proof.localhost 127.0.0.1"] });
  for (const [name, viewport] of [["Desktop", { width: 1440, height: 1000 }], ["Mobil", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
    const page = await context.newPage(), errors = [], apiResponses = [];
    activePage = page;
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (new URL(response.url()).pathname.startsWith("/api/")) apiResponses.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    await page.route("**/*", route => new URL(route.request().url()).origin === runtime.origin ? route.continue() : route.abort());
    await page.goto(`${runtime.origin}/__proof/login`);
    await page.locator(".home-destination-link:visible").first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll(".home-destination-link")].filter(element => element.getClientRects().length).every(element => getComputedStyle(element).opacity === "1"));
    assert.equal(await page.locator(".home-destination-link:visible").count(), 2);
    assert.equal(await page.locator(".home-destination-link:visible").first().evaluate(element => getComputedStyle(element).opacity), "1");
    const realSession = await page.evaluate(async () => (await fetch("/api/session")).json()); assert.equal(realSession.profile.display_name || realSession.profile.displayName, "Fiktive Administratorin");
    counts.browser++;
    const homeImage = path.join(reportDir, `${basename}_${name}_Start.png`); await page.screenshot({ path: homeImage, fullPage: true }); screenshots.push(homeImage);
    await page.goto(`${runtime.origin}/versorgung/kontakte`);
    await page.locator('[data-view-panel="contacts"].is-active').waitFor();
    await page.getByText("Fiktive Testperson", { exact: true }).first().waitFor(); counts.browser++;
    await page.goto(`${runtime.origin}/hospitationskompass`);
    await page.locator('[data-view-panel="hospitationOverview"].is-active').waitFor();
    await page.locator("body.hospitation-workspace-ready").waitFor();
    await page.locator("[data-ho-observations]").getByText("Fiktive Paketbeobachtung", { exact: true }).waitFor();
    assert(apiResponses.some(response => response.path === "/api/hospitations" && response.status === 200));
    assert(apiResponses.some(response => response.path === "/api/hospitation-observations" && response.status === 200));
    assert.deepEqual(apiResponses.filter(response => response.status >= 400), [], "Gebautes Frontend erhält nur erfolgreiche Kern-API-Antworten.");
    assert.deepEqual(errors, [], "Gebautes Frontend startet ohne Skriptfehler."); counts.browser++;
    const hospImage = path.join(reportDir, `${basename}_${name}_Hospitation.png`); await page.screenshot({ path: hospImage, fullPage: true }); screenshots.push(hospImage);
    await context.close();
    activePage = undefined;
  }
  await browser.close(); browser = undefined;
  await runtime.cleanup(); runtime = undefined;
  writeFileSync(reportPath, `${JSON.stringify({ schemaVersion: "gematik-local-proof-result/v1", status: "erfolgreich", startedAt, finishedAt: new Date().toISOString(), archive: path.basename(archive), archiveSha256, sourceRevision: manifest.sourceRevision, sourceDirty: manifest.sourceDirty, sourceDirtyHash: manifest.sourceDirtyHash, sourceInventoryDigest: manifest.sourceInventoryDigest, releaseEligible: false, syntheticDataOnly: true, institutionSsoVerified: false, images: manifest.images, checks: counts, screenshots: screenshots.map(file => path.basename(file)), cleanup: "erfolgreich" }, null, 2)}\n`);
  console.log(`Paketprobelauf erfolgreich: ${JSON.stringify(counts)}. Bericht: ${reportPath}`);
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: path.join(reportDir, `${basename}_Fehler.png`), fullPage: true }).catch(() => {});
    const state = await activePage.evaluate(() => ({ path: location.pathname, title: document.title, panels: [...document.querySelectorAll("[data-view-panel].is-active")].map(element => element.dataset.viewPanel), onboardingVisible: Boolean(document.querySelector('[data-view-panel="onboarding"].is-active')), appInitializing: Boolean(document.querySelector(".app-shell.is-initializing")) })).catch(() => ({ state: "nicht verfügbar" }));
    writeFileSync(path.join(reportDir, `${basename}_Fehlerzustand.json`), `${JSON.stringify(state, null, 2)}\n`);
  }
  writeFileSync(reportPath, `${JSON.stringify({ schemaVersion: "gematik-local-proof-result/v1", status: "fehlgeschlagen", startedAt, finishedAt: new Date().toISOString(), archive: archive ? path.basename(archive) : null, releaseEligible: false, syntheticDataOnly: true, checks: counts, error: "Lokaler Paketnachweis unvollständig. Kein Release oder Deployment erfolgt.", cleanup: "wird im Abschluss ausgeführt" }, null, 2)}\n`);
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.cleanup();
  rmSync(scratch, { recursive: true, force: true });
}
