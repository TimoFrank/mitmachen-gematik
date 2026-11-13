import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { artifactDigest } from "./lib/artifact-tree.mjs";
import { gematikDatabaseDigest } from "./hash_gematik_core_database.mjs";

const root = process.cwd();
mkdirSync(path.join(root, "dist"), { recursive: true });
const fixture = mkdtempSync(path.join(root, "dist", ".gematik-core-build-test-"));
const output = path.join(fixture, "frontend");
const build = () => execFileSync(process.execPath, ["scripts/build_gematik_frontend.mjs", "--output", output, "--api-base-url", "https://target.example.invalid"], { stdio: "pipe" });
const audit = () => spawnSync(process.execPath, ["scripts/audit_target_assets.mjs", "--artifact-root", output], { encoding: "utf8" });
try {
  build();
  assert.equal(audit().status, 0);
  const first = artifactDigest(output);
  build();
  assert.equal(first, artifactDigest(output), "Identische Quellen müssen dasselbe Kernfrontend ergeben.");
  writeFileSync(path.join(output, "data/demo-data.js"), "window.demo = {};\n");
  assert.notEqual(audit().status, 0, "Nachträglich ergänzte Demo-Dateien müssen die Abnahme sperren.");
  build();
  const config = path.join(output, "data/runtime-config.js");
  writeFileSync(config, readFileSync(config, "utf8").replace('productScope: "gematik-core"', 'productScope: "full"'));
  assert.notEqual(audit().status, 0, "Ein aufgeweiteter Funktionsumfang muss die Abnahme sperren.");
  assert.match(gematikDatabaseDigest(), /^sha256:[a-f0-9]{64}$/);
  assert.equal(gematikDatabaseDigest(), gematikDatabaseDigest());
  const outside = spawnSync(process.execPath, ["scripts/build_gematik_frontend.mjs", "--output", "/tmp/forbidden-gematik-artifact", "--api-base-url", "https://target.example.invalid"], { encoding: "utf8" });
  assert.notEqual(outside.status, 0);
  console.log("Gematik-Kernbuild: Reproduzierbarkeit, Funktionsgrenze und Artefaktmanipulation erfolgreich geprüft.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
