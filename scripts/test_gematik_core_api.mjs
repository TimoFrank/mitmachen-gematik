import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import https from "node:https";
import net from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { CORE_TABLES } from "../api/gematik-core-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = mkdtempSync(path.join(tmpdir(), "vk-core-api-"));
const container = `vk-core-api-${randomUUID().slice(0, 8)}`;
const password = randomUUID();
const origin = "https://gematik-core.example.invalid";
let api, jwks;
let logs = "";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function run(command, args, input) {
  return execFileSync(command, args, { cwd: root, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 180000 });
}
function docker(...args) { return run("docker", args); }
function sql(input, role = "postgres") {
  return docker("exec", "-i", container, "psql", "-U", role, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", input);
}
async function freePort() {
  const server = net.createServer(); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
try {
  assert.equal(spawnSync("docker", ["info"], { stdio: "ignore" }).status, 0, "Docker ist für diesen verbindlichen Test erforderlich.");
  run(process.execPath, ["api/build-target.mjs"]);
  const manifest = JSON.parse(readFileSync(new URL("../dist/gematik-core-api/build-manifest.json", import.meta.url)));
  assert.equal(manifest.scope, "gematik-core");
  assert.ok(manifest.inputs.every(value => !/google-|mac-sync|password-reset|user-administration|typo3|bundestag/u.test(value)));
  const runtime = readFileSync(new URL("../dist/gematik-core-api/server.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(runtime, /import\([^)]*(?:firebase|nodemailer|google-runtime|mac-sync|typo3|bundestag)/u);
  const corePackage = JSON.parse(readFileSync(new URL("../api/package.target.json", import.meta.url)));
  assert.deepEqual(Object.keys(corePackage.dependencies), ["pg"]);

  docker("run", "--detach", "--name", container, "--publish", "127.0.0.1::5432", "--env", `POSTGRES_PASSWORD=${password}`, "postgres:16-alpine");
  for (let i = 0; i < 100; i++) {
    if (spawnSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "ignore" }).status === 0) break;
    if (i === 99) throw new Error("PostgreSQL wurde nicht bereit."); await pause(100);
  }
  for (const file of ["runtime-role.sql", "schema.sql", "grants.sql"]) {
    run("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "runtime_role=vk_app_runtime"],
      readFileSync(new URL(`../deploy/postgres/gematik-core/${file}`, import.meta.url), "utf8"));
  }
  const tables = sql("select tablename from pg_tables where schemaname='public' order by tablename").trim().split("\n");
  assert.deepEqual(tables, [...CORE_TABLES].sort());
  sql(`create role core_runtime login password '${password}'; grant vk_app_runtime to core_runtime;`);
  sql("insert into public.profiles(id,email,display_name,role) values ('core-admin','admin@example.invalid','Demo Admin','admin'),('core-viewer','viewer@example.invalid','Demo Viewer','viewer')");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: "jwk" }), kid: "core-test-key", alg: "RS256", use: "sig" };
  run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(scratch, "key.pem"), "-out", path.join(scratch, "ca.pem"), "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"]);
  jwks = https.createServer({ key: readFileSync(path.join(scratch, "key.pem")), cert: readFileSync(path.join(scratch, "ca.pem")) }, (req, res) => {
    assert.equal(req.url, "/jwks"); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ keys: [key] }));
  });
  jwks.listen(0, "127.0.0.1"); await once(jwks, "listening");
  const issuer = `https://127.0.0.1:${jwks.address().port}/issuer`;
  sql(`insert into public.identity_bindings(issuer,subject,profile_id,active) values ('${issuer}','admin-sub','core-admin',true),('${issuer}','viewer-sub','core-viewer',true)`);
  function token(subject = "admin-sub", overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: key.kid })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ iss: issuer, aud: "core-api-test", sub: subject, iat: now, exp: now + 300, ...overrides })).toString("base64url");
    return `${header}.${body}.${sign("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url")}`;
  }
  const port = await freePort();
  const dbPort = docker("port", container, "5432/tcp").trim().split(":").at(-1);
  api = spawn(process.execPath, ["dist/gematik-core-api/server.mjs"], { cwd: root, env: {
    ...process.env, NODE_ENV: "production", API_AUTH_MODE: "oidc", ALLOWED_ORIGIN: origin, PORT: String(port),
    OIDC_ISSUER: issuer, OIDC_AUDIENCE: "core-api-test", OIDC_JWKS_URL: `https://127.0.0.1:${jwks.address().port}/jwks`,
    NODE_EXTRA_CA_CERTS: path.join(scratch, "ca.pem"), DB_HOST: "127.0.0.1", DB_PORT: dbPort, DB_NAME: "postgres",
    DB_USER: "core_runtime", DB_PASSWORD: password, DB_SSL_MODE: "disable", DATABASE_URL: "", DB_SSL: "", PGSSLMODE: "",
    API_AUTH_ALLOW_DEV_PROFILE: "0", API_AUTH_ALLOW_BEARER_DEV: "0", LOCAL_APP_SYNC: "0", MAC_SYNC_ENABLED: "0",
    ATTACHMENT_UPLOAD_MODE: "disabled", IMAGE_UPLOAD_MODE: "disabled", API_LOG_REQUESTS: "0"
  }, stdio: ["ignore", "pipe", "pipe"] });
  api.stdout.on("data", chunk => logs += chunk); api.stderr.on("data", chunk => logs += chunk);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) throw new Error(`API beendet: ${logs}`);
    try { if ((await fetch(`${base}/api/readyz`)).status === 200) break; } catch {}
    if (i === 99) throw new Error(`API wurde nicht bereit: ${logs}`); await pause(100);
  }
  async function request(method, route, body, jwt = token()) {
    const response = await fetch(base + route, { method, headers: { origin, ...(jwt ? { authorization: `Bearer ${jwt}` } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  assert.equal((await request("GET", "/api/session", undefined, "")).status, 401);
  assert.equal((await request("GET", "/api/session", undefined, token("unknown-sub"))).status, 403);
  assert.equal((await request("GET", "/api/session", undefined, token("admin-sub", { aud: "wrong" }))).status, 401);
  const session = await request("GET", "/api/session");
  assert.equal(session.status, 200); assert.equal(session.body.authMode, "oidc"); assert.equal(session.body.profile.id, "core-admin");
  for (const route of ["/api/profiles", "/api/contacts", "/api/organizations", "/api/hospitations", "/api/hospitation-observations", "/api/roadmap-items", "/api/activities", "/api/notifications", "/api/ops/summary", "/api/ops/checks"]) {
    const result = await request("GET", route); assert.equal(result.status, 200, `${route}: ${JSON.stringify(result.body)}`);
  }
  for (const route of ["/api/formats", "/api/formats/test/participants", "/api/expert-contacts", "/api/expert-organizations", "/api/expert-entity-links", "/api/stakeholder-people", "/api/stakeholder-organizations", "/api/politics/health-committee", "/api/connectors/typo3/mitmachen-registrations", "/api/auth/external-enrollment", "/api/admin/users", "/api/mac-sync/snapshot"]) {
    for (const method of ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]) {
      assert.equal((await request(method, route, ["GET", "OPTIONS"].includes(method) ? undefined : {})).status, 404, `${method} ${route}`);
    }
  }
  assert.equal((await request("POST", "/api/contacts", { name: "Demo forbidden" }, token("viewer-sub"))).status, 403);
  const organization = await request("POST", "/api/organizations", { name: "Demo Kernpraxis", city: "Bonn", sector: "Praxis" });
  assert.equal(organization.status, 201, JSON.stringify(organization.body));
  const contact = await request("POST", "/api/contacts", { name: "Demo Kernkontakt", city: "Bonn", category: "Praxis", organizationId: organization.body.id, ownerId: "core-admin" });
  assert.equal(contact.status, 201, JSON.stringify(contact.body));
  assert.equal(sql("select public.gematik_core_activity_contact_references_match('[{\"type\":\"contact\",\"id\":\"foreign-contact\"}]'::jsonb, 'expected-contact')", "core_runtime").trim(), "f");
  assert.throws(() => sql(`insert into public.activity_events(event_key,category,action,entity_type,entity_id,contact_id,"references") values ('contact.updated','master_data','update','contact','${contact.body.id}','${contact.body.id}','[{"type":"contact","id":"foreign-contact"}]')`, "core_runtime"),
    error => /activity_events_contact_reference_check/u.test(String(error.stderr)),
    "Die Datenbank muss widersprüchliche Kontaktverweise auch bei direktem SQL abweisen.");
  const hospitation = await request("POST", "/api/hospitations", { id: "core-hospitation", contactId: contact.body.id, organizationId: organization.body.id, startsAt: "2027-01-10T09:00:00Z", endsAt: "2027-01-10T10:00:00Z", city: "Bonn", sector: "Praxis", status: "Gebucht" });
  assert.equal(hospitation.status, 201, JSON.stringify(hospitation.body));
  const source = { kind: "plaud_transcript", recordingId: "of_" + "a".repeat(32), sha256: "b".repeat(64), segmentStart: 1, segmentEnd: 2, indexBase: 1 };
  const observation = { hospitationId: "core-hospitation", title: "Demo Kernbeobachtung", situation: "Synthetischer Test", description: "Fiktive Beobachtung für den Test", limitations: "Keine Forschungsdaten" };
  const preview = await request("POST", "/api/hospitation-observations", { mode: "preview", source, observation });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  const applied = await request("POST", "/api/hospitation-observations", { mode: "apply", source, observation, expectedTargetFingerprint: preview.body.targetFingerprint, expectedCandidateFingerprint: preview.body.candidateFingerprint, confirmation: "append-source-observation" });
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  const exported = await request("GET", "/api/export");
  assert.equal(exported.status, 200); assert.ok(exported.body.data.hospitations.length); assert.ok(exported.body.data.hospitation_observations.length);
  assert.ok(Object.keys(exported.body.data).every(table => CORE_TABLES.includes(table)));
  assert.equal(exported.body.data.identity_bindings, undefined);
  assert.equal(exported.body.data.formats, undefined);
  assert.match(sql("select count(*) from public.activity_events"), /[1-9]/u);
  assert.equal(sql("select has_table_privilege('core_runtime','public.activity_events','UPDATE')").trim(), "f");
  console.log("gematik-core API erfolgreich: echter OIDC-Login, Rollen, Kern-CRUD, Beobachtungsübernahme, Export, DB-Allowlist und entfernte HTTP-Endpunkte.");
} finally {
  if (api && api.exitCode === null) { const done = once(api, "exit"); api.kill("SIGTERM"); await Promise.race([done, pause(5000)]); if (api.exitCode === null) { api.kill("SIGKILL"); await done; } }
  if (jwks?.listening) await new Promise(resolve => jwks.close(resolve));
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  rmSync(scratch, { recursive: true, force: true });
}
