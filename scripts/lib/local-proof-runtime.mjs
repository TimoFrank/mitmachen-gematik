import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { once } from "node:events";
import { chmodSync, constants, createReadStream, createWriteStream, closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync, writeSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGunzip, createGzip } from "node:zlib";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const safePath = value => /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(value) && value.split("/").every(part => part && part !== "." && part !== "..");
const allowedPayload = /^(?:frontend\/.+|database\/(?:schema\.sql|runtime-role\.sql|grants\.sql|README\.md|migrations\/README\.md)|images\/(?:api|postgres)\.tar|runtime\/start\.mjs|provenance\/import-manifest\.json|(?:LICENSE|NOTICE\.md|DATA_NOTICE\.md|README\.md|frontend-sbom\.cdx\.json))$/u;
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export async function fileHash(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export function filesIn(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), "Symlink im Paket.");
    assert(entry.isDirectory() || entry.isFile(), "Unzulässiger Dateityp im Paket.");
    return entry.isDirectory() ? filesIn(root, file) : [path.relative(root, file).split(path.sep).join("/")];
  }).sort();
}
export function command(program, args, input, timeout = 300000) {
  try { return execFileSync(program, args, { input, encoding: "utf8", timeout, maxBuffer: 20 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }); }
  catch { throw new Error(`${program}: lokaler Prüfschritt fehlgeschlagen. Zugangsdaten werden nicht protokolliert.`); }
}
export const docker = (...args) => command("docker", args);

// Eigenes kleines USTAR-Format. Keine erweiterten Header, Links oder Geräte.
export async function writeArchive(root, archive) {
  async function* records() {
    for (const file of filesIn(root)) {
      const name = `proof-package/${file}`;
      assert(safePath(name), "Ungültiger Paketpfad.");
      const header = Buffer.alloc(512);
      let leaf = name, prefix = "";
      if (Buffer.byteLength(name) > 100) {
        const split = name.lastIndexOf("/");
        prefix = name.slice(0, split); leaf = name.slice(split + 1);
      }
      assert(Buffer.byteLength(leaf) <= 100 && Buffer.byteLength(prefix) <= 155, "USTAR-Pfad ist zu lang.");
      header.write(leaf, 0, 100); header.write("0000644\0", 100); header.write("0000000\0", 108); header.write("0000000\0", 116);
      const size = lstatSync(path.join(root, file)).size;
      header.write(`${size.toString(8).padStart(11, "0")}\0`, 124);
      header.write("00000000000\0", 136); header.fill(32, 148, 156); header[156] = 48;
      header.write("ustar\0", 257); header.write("00", 263); header.write(prefix, 345, 155);
      header.write(`${header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0")}\0 `, 148);
      yield header;
      for await (const chunk of createReadStream(path.join(root, file))) yield chunk;
      if (size % 512) yield Buffer.alloc(512 - size % 512);
    }
    yield Buffer.alloc(1024);
  }
  await pipeline(Readable.from(records()), createGzip({ level: 6 }), createWriteStream(archive, { flags: "wx", mode: 0o600 }));
}

export async function extractVerifiedPackage(archive, destination) {
  assert(lstatSync(archive).isFile() && !lstatSync(archive).isSymbolicLink(), "Paket muss eine reguläre Datei sein.");
  assert(lstatSync(archive).size <= 768 * 1024 * 1024, "Komprimiertes Paket ist zu groß.");
  assert(!existsSync(destination), "Entpackziel muss neu sein.");
  mkdirSync(destination, { mode: 0o700 });
  let pending = Buffer.alloc(0), current, fd, padding = 0, zeros = 0, ended = false, total = 0;
  const names = new Set();
  const text = (header, start, length) => header.subarray(start, start + length).toString("utf8").split("\0")[0];
  const octal = value => { assert(/^[0-7]+\0? *$/u.test(value), "Ungültige USTAR-Zahl."); return parseInt(value, 8); };
  try {
    for await (const chunk of createReadStream(archive).pipe(createGunzip())) {
      total += chunk.length;
      assert(total <= 2 * 1024 ** 3, "Entpacktes Paket ist zu groß.");
      pending = Buffer.concat([pending, chunk]);
      while (pending.length) {
        if (ended) { assert(pending.every(byte => byte === 0), "Daten nach dem Archivende."); pending = Buffer.alloc(0); break; }
        if (current) {
          const take = Math.min(current.remaining, pending.length);
          let written = 0;
          while (written < take) written += writeSync(fd, pending, written, take - written);
          pending = pending.subarray(take); current.remaining -= take;
          if (current.remaining) break;
          closeSync(fd); fd = undefined; padding = (512 - current.size % 512) % 512; current = undefined;
        } else if (padding) {
          const take = Math.min(padding, pending.length);
          assert(pending.subarray(0, take).every(byte => byte === 0), "Ungültiges Archivpadding.");
          padding -= take; pending = pending.subarray(take);
        } else {
          if (pending.length < 512) break;
          const header = Buffer.from(pending.subarray(0, 512)); pending = pending.subarray(512);
          if (header.every(byte => byte === 0)) { zeros++; if (zeros === 2) ended = true; continue; }
          assert.equal(zeros, 0, "Unvollständiges Archivende.");
          const expected = octal(header.subarray(148, 156).toString("ascii"));
          header.fill(32, 148, 156);
          assert.equal(header.reduce((sum, byte) => sum + byte, 0), expected, "Ungültige Headerprüfsumme.");
          assert.equal(header.subarray(257, 263).toString("ascii"), "ustar\0", "Nur USTAR ist erlaubt.");
          assert(header[156] === 48 || header[156] === 0, "Links und besondere Dateitypen sind verboten.");
          assert(!text(header, 157, 100), "Linkziel ist verboten.");
          const prefix = text(header, 345, 155), name = `${prefix ? `${prefix}/` : ""}${text(header, 0, 100)}`;
          assert(safePath(name) && name.startsWith("proof-package/"), "Unsicherer Archivpfad.");
          assert(allowedPayload.test(name.slice("proof-package/".length)) || ["proof-package/package-manifest.json", "proof-package/SHA256SUMS"].includes(name), "Ungeplanter Archivpfad.");
          assert(!names.has(name) && names.size < 10000, "Doppelter Pfad oder zu viele Dateien."); names.add(name);
          const size = octal(header.subarray(124, 136).toString("ascii"));
          assert(size <= 1024 ** 3, "Einzeldatei ist zu groß.");
          const target = path.join(destination, name);
          mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
          fd = openSync(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
          current = { size, remaining: size };
          if (size === 0) { closeSync(fd); fd = undefined; current = undefined; }
        }
      }
    }
    assert(ended && !current && !padding && pending.length === 0, "Abgeschnittenes Archiv.");
    return await verifyPackageDirectory(path.join(destination, "proof-package"));
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}

export async function verifyPackageDirectory(root) {
    const actualFiles = filesIn(root);
    const manifest = JSON.parse(readFileSync(path.join(root, "package-manifest.json"), "utf8"));
    assert.equal(manifest.schemaVersion, "gematik-local-proof/v1");
    assert.equal(manifest.releaseEligible, false);
    assert.equal(manifest.dataClassification, "synthetic-only");
    assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/u);
    assert.equal(typeof manifest.sourceDirty, "boolean");
    assert(manifest.sourceDirty ? /^sha256:[a-f0-9]{64}$/u.test(manifest.sourceDirtyHash) : manifest.sourceDirtyHash === null, "Dirty-Nachweis fehlt.");
    assert.match(manifest.sourceInventoryDigest, /^sha256:[a-f0-9]{64}$/u);
    const origin = new URL(manifest.origin);
    assert(origin.protocol === "https:" && origin.hostname === "gematik-proof.localhost" && origin.origin === manifest.origin, "Nur lokaler Probe-Origin erlaubt.");
    assert.deepEqual(Object.keys(manifest.images).sort(), ["api", "postgres"]);
    for (const [name, image] of Object.entries(manifest.images)) {
      assert.equal(image.archive, `images/${name}.tar`);
      assert.match(image.imageId, /^sha256:[a-f0-9]{64}$/u);
      assert.equal(image.os, "linux");
      assert(["amd64", "arm64"].includes(image.architecture), "Unbekannte Containerarchitektur.");
    }
    assert(Array.isArray(manifest.files) && manifest.files.length < 10000, "Dateiinventar fehlt.");
    const expectedFiles = manifest.files.map(entry => entry.path);
    assert.equal(new Set(expectedFiles).size, expectedFiles.length, "Doppelter Inventarpfad.");
    for (const entry of manifest.files) {
      assert(safePath(entry.path) && allowedPayload.test(entry.path), "Ungeplanter Paketinhalt.");
      assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
      assert.equal(lstatSync(path.join(root, entry.path)).size, entry.size, "Dateigröße weicht ab.");
      assert.equal(await fileHash(path.join(root, entry.path)), entry.sha256, "Dateiprüfsumme weicht ab.");
    }
    for (const required of ["frontend/index.html", "frontend/build-manifest.json", "images/api.tar", "images/postgres.tar", "database/schema.sql", "database/runtime-role.sql", "database/grants.sql", "runtime/start.mjs", "README.md", "LICENSE", "NOTICE.md", "DATA_NOTICE.md", "provenance/import-manifest.json"]) {
      assert(expectedFiles.includes(required), "Erforderlicher Paketinhalt fehlt.");
    }
    assert.deepEqual(actualFiles, [...expectedFiles, "package-manifest.json", "SHA256SUMS"].sort(), "Gesamtinventar weicht ab.");
    const checksumFiles = [...expectedFiles, "package-manifest.json"].sort();
    const checksums = await Promise.all(checksumFiles.map(async file => `${await fileHash(path.join(root, file))}  ${file}\n`));
    assert.equal(readFileSync(path.join(root, "SHA256SUMS"), "utf8"), checksums.join(""), "Prüfsummenliste weicht ab.");
    assert.equal(await fileHash(path.join(root, "provenance/import-manifest.json")), manifest.sourceManifestSha256, "Quellmanifest weicht ab.");
    assert.equal(JSON.parse(readFileSync(path.join(root, "provenance/import-manifest.json"))).inventoryDigest, manifest.sourceInventoryDigest, "Quellinventar weicht ab.");
    return { root, manifest };
}

export async function startRuntime(root, manifest) {
  assert.deepEqual((await verifyPackageDirectory(root)).manifest, manifest, "Runtime und geprüftes Manifest müssen übereinstimmen.");
  const runId = randomUUID();
  const network = `vk-proof-${runId}`, pg = `${network}-db`, api = `${network}-api`, jwks = `${network}-jwks`;
  const scratch = mkdtempSync(path.join(tmpdir(), "vk-proof-secrets-"));
  const origin = manifest.origin, originUrl = new URL(origin);
  assert.equal(originUrl.hostname, "gematik-proof.localhost");
  assert.equal(originUrl.protocol, "https:");
  assert.equal(originUrl.origin, origin);
  let gateway;
  const loadedImages = [];
  const cleanup = async () => {
    if (gateway?.listening) { gateway.closeAllConnections(); await new Promise(resolve => gateway.close(resolve)); }
    for (const name of [api, jwks, pg]) spawnSync("docker", ["rm", "--force", "--volumes", name], { stdio: "ignore" });
    spawnSync("docker", ["network", "rm", network], { stdio: "ignore" });
    for (const id of loadedImages) spawnSync("docker", ["image", "rm", id], { stdio: "ignore" });
    rmSync(scratch, { recursive: true, force: true });
    for (const name of [api, jwks, pg]) assert.notEqual(spawnSync("docker", ["inspect", name], { stdio: "ignore" }).status, 0, "Testcontainer konnte nicht entfernt werden.");
    assert.notEqual(spawnSync("docker", ["network", "inspect", network], { stdio: "ignore" }).status, 0, "Testnetz konnte nicht entfernt werden.");
  };
  try {
    for (const image of Object.values(manifest.images)) {
      assert.match(image.imageId, /^sha256:[a-f0-9]{64}$/u);
      const alreadyPresent = spawnSync("docker", ["image", "inspect", image.imageId], { stdio: "ignore" }).status === 0;
      docker("load", "--input", path.join(root, image.archive));
      if (!alreadyPresent) loadedImages.push(image.imageId);
      const actual = JSON.parse(docker("image", "inspect", image.imageId))[0];
      assert.equal(actual.Id, image.imageId); assert.equal(actual.Os, image.os); assert.equal(actual.Architecture, image.architecture); assert.equal(actual.Variant || "", image.variant || "");
    }
    const password = randomUUID(), adminSubject = randomUUID(), viewerSubject = randomUUID();
    const adminId = randomUUID(), viewerId = randomUUID(), adminCookie = randomUUID(), viewerCookie = randomUUID();
    const issuer = "https://proof-jwks:8443/issuer", audience = `proof-${randomUUID()}`;
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: "jwk" }), kid: randomUUID(), alg: "RS256", use: "sig" };
    command("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(scratch, "key.pem"), "-out", path.join(scratch, "ca.pem"), "-days", "1", "-subj", "/CN=proof-jwks", "-addext", "subjectAltName=DNS:proof-jwks,DNS:proof-db,DNS:gematik-proof.localhost,IP:127.0.0.1"]);
    // Das geschützte temporäre Elternverzeichnis bleibt nur für diesen Prozess lesbar.
    for (const file of ["key.pem", "ca.pem"]) chmodSync(path.join(scratch, file), 0o644);
    const jwksCode = `import https from 'node:https'; import fs from 'node:fs'; https.createServer({key:fs.readFileSync('/proof/key.pem'),cert:fs.readFileSync('/proof/ca.pem')},(req,res)=>{if(req.url!=='/jwks'){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({keys:[${JSON.stringify(jwk)}]}));}).listen(8443,'0.0.0.0');`;
    writeFileSync(path.join(scratch, "jwks.mjs"), jwksCode, { mode: 0o644 });
    docker("network", "create", network);
    const postgresMounts = ["key.pem", "ca.pem"].flatMap(file => ["--mount", `type=bind,source=${path.join(scratch, file)},target=/proof/${file},readonly`]);
    docker("run", "--detach", "--name", pg, "--network", network, "--network-alias", "proof-db", "--env", `POSTGRES_PASSWORD=${password}`, ...postgresMounts, "--entrypoint", "sh", manifest.images.postgres.imageId, "-c", "cp /proof/key.pem /var/lib/postgresql/proof.key && cp /proof/ca.pem /var/lib/postgresql/proof.crt && chown postgres:postgres /var/lib/postgresql/proof.key /var/lib/postgresql/proof.crt && chmod 600 /var/lib/postgresql/proof.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_key_file=/var/lib/postgresql/proof.key -c ssl_cert_file=/var/lib/postgresql/proof.crt");
    for (let i = 0; i < 200; i++) {
      if (spawnSync("docker", ["exec", pg, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "ignore" }).status === 0) break;
      assert(i < 199, "PostgreSQL startet nicht."); await pause(100);
    }
    const sql = input => command("docker", ["exec", "-i", pg, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "runtime_role=vk_app_runtime", "-At"], input);
    for (const file of ["runtime-role.sql", "schema.sql", "grants.sql"]) sql(readFileSync(path.join(root, "database", file)));
    sql(`create role proof_runtime login password '${password}'; grant vk_app_runtime to proof_runtime;
      insert into profiles(id,email,display_name,role) values ('${adminId}','admin@example.invalid','Fiktive Administratorin','admin'),('${viewerId}','viewer@example.invalid','Fiktiver Leser','viewer');
      insert into identity_bindings(issuer,subject,profile_id,active) values ('${issuer}','${adminSubject}','${adminId}',true),('${issuer}','${viewerSubject}','${viewerId}',true);`);
    const mounts = ["key.pem", "ca.pem", "jwks.mjs"].flatMap(file => ["--mount", `type=bind,source=${path.join(scratch, file)},target=/proof/${file},readonly`]);
    docker("run", "--detach", "--name", jwks, "--network", network, "--network-alias", "proof-jwks", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", ...mounts, "--entrypoint", "node", manifest.images.api.imageId, "/proof/jwks.mjs");
    const environment = {
      NODE_ENV: "production", API_AUTH_MODE: "oidc", ALLOWED_ORIGIN: origin, PORT: "8080", OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: audience, OIDC_JWKS_URL: "https://proof-jwks:8443/jwks", NODE_EXTRA_CA_CERTS: "/proof-ca.pem",
      DB_HOST: "proof-db", DB_PORT: "5432", DB_NAME: "postgres", DB_USER: "proof_runtime", DB_PASSWORD: password,
      DB_SSL_MODE: "verify-full", DB_SSL_CA_FILE: "/proof-ca.pem", API_AUTH_ALLOW_DEV_PROFILE: "0", API_AUTH_ALLOW_BEARER_DEV: "0", LOCAL_APP_SYNC: "0", MAC_SYNC_ENABLED: "0",
      ATTACHMENT_UPLOAD_MODE: "disabled", IMAGE_UPLOAD_MODE: "disabled", API_LOG_REQUESTS: "0"
    };
    docker("run", "--detach", "--name", api, "--network", network, "--publish", "127.0.0.1::8080", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--mount", `type=bind,source=${path.join(scratch, "ca.pem")},target=/proof-ca.pem,readonly`, ...Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]), manifest.images.api.imageId);
    const port = docker("port", api, "8080/tcp").trim().split(":").at(-1);
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 200; i++) {
      try { if ((await fetch(`${base}/api/readyz`)).status === 200) break; } catch {}
      assert(i < 199, "API startet nicht."); await pause(100);
    }
    function token(role = "admin", overrides = {}) {
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
      const body = Buffer.from(JSON.stringify({ iss: issuer, aud: audience, sub: role === "viewer" ? viewerSubject : adminSubject, iat: now, exp: now + 300, ...overrides })).toString("base64url");
      return `${header}.${body}.${sign("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url")}`;
    }
    async function request(method, route, body, role = "admin", overrides = {}) {
      const response = await fetch(base + route, { method, headers: { origin, "content-type": "application/json", ...(role ? { authorization: `Bearer ${token(role, overrides)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }
    const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json" };
    const staticRoot = path.join(root, "frontend");
    gateway = https.createServer({ key: readFileSync(path.join(scratch, "key.pem")), cert: readFileSync(path.join(scratch, "ca.pem")) }, (incoming, outgoing) => {
      const url = new URL(incoming.url, origin);
      if (incoming.headers.host !== originUrl.host) { outgoing.writeHead(421).end(); return; }
      if (url.pathname === "/__proof/login") {
        const cookie = url.searchParams.get("role") === "viewer" ? viewerCookie : adminCookie;
        outgoing.writeHead(303, { location: "/start", "set-cookie": `proof_session=${cookie}; Path=/; Secure; HttpOnly; SameSite=Strict`, "cache-control": "no-store" }).end(); return;
      }
      if (url.pathname.startsWith("/api/")) {
        const cookie = String(incoming.headers.cookie || "").split(/;\s*/u).find(value => value.startsWith("proof_session="))?.slice(14);
        const role = cookie === adminCookie ? "admin" : cookie === viewerCookie ? "viewer" : "";
        const headers = { ...incoming.headers, host: new URL(base).host };
        delete headers.authorization; delete headers.cookie;
        if (role) headers.authorization = `Bearer ${token(role)}`;
        const proxied = http.request(base + incoming.url, { method: incoming.method, headers }, response => { outgoing.writeHead(response.statusCode, response.headers); response.pipe(outgoing); });
        proxied.on("error", () => outgoing.writeHead(502).end()); incoming.pipe(proxied); return;
      }
      let decoded;
      try { decoded = decodeURIComponent(url.pathname); } catch { outgoing.writeHead(400).end(); return; }
      const route = /^\/(?:start|versorgung(?:\/.*)?|hospitationskompass(?:\/.*)?|hospitationen(?:\/.*)?|profil(?:\/.*)?|teams|einstellungen|kontakt\/[^/]+|organisation\/[^/]+)$/u.test(decoded);
      const relative = route ? "versorgungs-kompass.html" : decoded === "/" ? "index.html" : decoded.slice(1);
      const file = path.resolve(staticRoot, relative);
      if (!["GET", "HEAD"].includes(incoming.method) || !file.startsWith(`${staticRoot}${path.sep}`) || !existsSync(file) || !lstatSync(file).isFile()) { outgoing.writeHead(404).end(); return; }
      outgoing.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      if (incoming.method === "HEAD") outgoing.end(); else createReadStream(file).pipe(outgoing);
    });
    gateway.listen(Number(originUrl.port || 443), "127.0.0.1"); await once(gateway, "listening");
    return { origin, request, cleanup, adminId, viewerId, sql, container: api };
  } catch (error) { await cleanup(); throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(readFileSync(path.join(root, "package-manifest.json")));
  const runtime = await startRuntime(root, manifest);
  console.log(`Lokaler Probelauf mit fiktiven Daten: ${runtime.origin}/__proof/login`);
  console.log("Das kurzlebige Testzertifikat benötigt im Browser eine lokale Ausnahme. Mit Strg+C beenden und Testdaten entfernen.");
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { if (!closing) { closing = true; await runtime.cleanup(); process.exit(0); } });
}
