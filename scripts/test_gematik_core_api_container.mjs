import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const image = `vk-core-container-test:${randomUUID()}`;
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const productVersion = JSON.parse(readFileSync(new URL("../config/release.json", import.meta.url))).productVersion;
const run = (args, input) => execFileSync("docker", args, { cwd: root, input, encoding: "utf8", timeout: 180000, stdio: ["pipe", "pipe", "pipe"] });
try {
  run(["build", "-f", "api/Dockerfile", "-t", image, "--build-arg", `PRODUCT_VERSION=${productVersion}`, "--build-arg", `SOURCE_REVISION=${revision}`, "--build-arg", "SOURCE_URL=https://github.com/TimoFrank/mitmachen", "."]);
  const output = run(["run", "--rm", "-i", "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--env", "PORT=0", "--env", "API_AUTH_MODE=oidc", "--env", "ALLOWED_ORIGIN=https://core.example.invalid", "--env", "OIDC_ISSUER=https://identity.example.invalid", "--env", "OIDC_AUDIENCE=core-test", "--env", "OIDC_JWKS_URL=https://identity.example.invalid/jwks", "--entrypoint", "node", image, "--input-type=module", "-"], `
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { once } from "node:events";
assert.notEqual(process.getuid(), 0);
assert.deepEqual(readdirSync("/app").sort(), ["build-manifest.json", "node_modules", "package-lock.json", "package.json", "server.mjs"]);
const require = createRequire(import.meta.url);
assert.throws(() => require.resolve("nodemailer"));
assert.throws(() => require.resolve("firebase-admin"));
assert.equal(JSON.parse(readFileSync("/app/build-manifest.json")).scope, "gematik-core");
const { server } = await import("file:///app/server.mjs");
if (!server.listening) await once(server, "listening");
const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/healthz");
assert.equal(response.status, 200);
const removed = await fetch("http://127.0.0.1:" + server.address().port + "/api/politics/health-committee");
assert.equal(removed.status, 404);
await new Promise(resolve => server.close(resolve));
console.log("CORE_CONTAINER_OK");
process.exit(0);
`);
  assert.match(output, /CORE_CONTAINER_OK/u);
  console.log("gematik-core Container erfolgreich: eigenständiger Build, Non-Root, schreibgeschützte Laufzeit, keine privaten Dateien oder SMTP-/Firebase-Pakete, HTTP-Start.");
} finally {
  spawnSync("docker", ["image", "rm", "--force", image], { stdio: "ignore" });
}
