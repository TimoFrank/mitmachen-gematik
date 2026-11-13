import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (file) => readFileSync(file, "utf8");
const required = [
  "README.md", "SECURITY.md", "LICENSE",
  "dokumentation/gematik/ANWENDUNG.md", "dokumentation/gematik/ARCHITEKTUR_UND_DATEN.md",
  "dokumentation/gematik/DATENSCHUTZ_UND_COMPLIANCE.md", "dokumentation/gematik/ENTWICKLUNG_UND_QA.md",
  "dokumentation/gematik/RELEASE_UND_UPDATES.md", "dokumentation/betrieb-und-deployment/BETRIEB_GEMATIK.md",
  "api/Dockerfile", "api/build-target.mjs", "api/gematik-core-policy.mjs", "api/package.target.json",
  "deploy/postgres/gematik-core/schema.sql", "deploy/postgres/gematik-core/grants.sql",
  "deploy/postgres/gematik-core/runtime-role.sql", "deploy/postgres/poc-gematik/bind-oidc-identity.sql",
  "deploy/helm/versorgungs-kompass/values-target-gematik.yaml", "deploy/jenkins/Jenkinsfile.gematik",
  "scripts/build_gematik_frontend.mjs", "scripts/audit_gematik_core_assets.mjs",
  "scripts/verify_target_release_source.mjs", "scripts/verify_release_tag.mjs",
  "scripts/generate_frontend_sbom.mjs", "scripts/generate_security_evidence.mjs",
  "scripts/test_gematik_core_api.mjs", "scripts/test_gematik_core_build.mjs"
];
for (const file of required) assert(existsSync(file), `Target-Quelle fehlt: ${file}`);
for (const file of ["api/server.mjs", "api/build-target.mjs", "api/security-policy.mjs", "api/gematik-core-policy.mjs", "scripts/build_gematik_frontend.mjs", "scripts/audit_gematik_core_assets.mjs", "scripts/prepare_target_frontend_config.mjs", "scripts/verify_target_release_source.mjs", "scripts/verify_release_tag.mjs"]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}
const dependencies = JSON.parse(read("api/package.target.json")).dependencies;
assert.deepEqual(Object.keys(dependencies), ["pg"], "Die Target-Laufzeit enthält nur den PostgreSQL-Treiber.");
const docker = read("api/Dockerfile");
assert.match(docker, /AS target-build/);
assert.match(docker, /node api\/build-target\.mjs/);
assert.match(docker, /COPY --from=target-build[^\n]+server\.mjs/);
assert.match(docker, /USER node/);
assert.match(docker, /npm ci --omit=dev --ignore-scripts/);
assert.match(docker, /org\.opencontainers\.image\.revision/);
const policy = read("api/gematik-core-policy.mjs");
assert.match(policy, /export const CORE_TABLES/);
assert.match(policy, /export function coreRouteAllowed/);
assert.match(policy, /hospitation/);
const schema = read("deploy/postgres/gematik-core/schema.sql");
assert.match(schema, /create table if not exists public\.contacts/i);
assert.match(schema, /create table if not exists public\.hospitation_observations/i);
assert.doesNotMatch(schema, /create table if not exists public\.(?:formats|format_participants|stakeholder_\w+|expert_\w+|network_\w+)/i);
const jenkins = read("deploy/jenkins/Jenkinsfile.gematik");
for (const pattern of [
  /skipDefaultCheckout\(true\)/, /verify_target_release_source\.mjs/, /--expected-repository-url/,
  /--public-key-file/, /--fingerprint/, /npm run check:target-release/, /API_AUTH_MODE=oidc/,
  /TARGET_DEPLOYMENT_APPROVED/, /REQUIRE_EXTERNAL_SECURITY_EVIDENCE/, /sonarqube-gate\.json/,
  /snyk-gate\.json/, /dependency-track-gate\.json/, /cosign-attestation-ready\.json/,
  /cosign-attestation\.json/, /--set-string image\.digest/, /versorgungs-target-kube-context/,
  /versorgungs-target-api-allowed-cidrs-json/, /Authorization: Bearer \$OIDC_SMOKE_BEARER_TOKEN/,
  /operationalAcceptance:[\s\S]{0,100}status:\s*"pending"/, /deploy\/postgres\/gematik-core\/schema\.sql/
]) assert.match(jenkins, pattern, `Ein bestehendes Target-Sicherheitsgate fehlt: ${pattern}`);
const verifier = read("scripts/verify_target_release_source.mjs");
for (const pattern of [/expected-repository-url/, /public-key-file/, /fingerprint/, /remoteTagObjectSha/, /verify_release_tag\.mjs/]) assert.match(verifier, pattern);
const target = read("deploy/helm/versorgungs-kompass/values-target-gematik.yaml");
assert.match(target, /oidc/);
assert.doesNotMatch(target, /0\.0\.0\.0\/0|::\/0/);
console.log("Gematik-Kernbereitschaft: Quellen, zwei Fachbereiche und bestehende Sicherheitsgates geprüft.");
