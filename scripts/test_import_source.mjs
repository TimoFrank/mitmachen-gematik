import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeImportManifest, readImportManifest, verifyImportManifest, writeImportManifest } from "./lib/import-source.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "mitmachen-import-contract-"));
function write(file, content) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), content);
}
try {
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  write(".gitignore", "dist/\nnode_modules/\n");
  write("README.md", "Kernquelle\n");
  write("dokumentation/quellen/ursprungsmanifest.json", JSON.stringify({ productScope: "gematik-core", sourceRevision: "a".repeat(40), workingTreeDirty: true }));
  const manifest = makeImportManifest(root);
  assert.equal(verifyImportManifest(root, manifest), 3);
  write("dist/build.json", "{}");
  write("node_modules/fixture/index.js", "");
  verifyImportManifest(root, manifest);
  write("README.md", "Ungeprüft verändert\n");
  assert.throws(() => verifyImportManifest(root, manifest), /weichen/);
  write("README.md", "Kernquelle\n");
  write("extra.txt", "Ungeprüft ergänzt\n");
  assert.throws(() => verifyImportManifest(root, manifest), /weichen/);
  rmSync(path.join(root, "extra.txt"));
  write(".git/info/exclude", "frontend/data/hidden.js\n");
  write("frontend/data/hidden.js", "Versteckte Quelle\n");
  assert.throws(() => verifyImportManifest(root, manifest), /weichen/);
  rmSync(path.join(root, "frontend/data/hidden.js"));
  write(".git/global-ignore", "frontend/data/hidden-global.js\n");
  execFileSync("git", ["config", "core.excludesFile", path.join(root, ".git/global-ignore")], { cwd: root });
  write("frontend/data/hidden-global.js", "Global versteckte Quelle\n");
  assert.throws(() => verifyImportManifest(root, manifest), /weichen/);
  rmSync(path.join(root, "frontend/data/hidden-global.js"));
  write("frontend/data/.gitignore", "*\n");
  write("frontend/data/hidden-nested.js", "Durch unversionierte Ignoredatei versteckt\n");
  assert.throws(() => verifyImportManifest(root, manifest), /weichen/);
  rmSync(path.join(root, "frontend/data/.gitignore"));
  rmSync(path.join(root, "frontend/data/hidden-nested.js"));
  writeImportManifest(root, manifest);
  assert.deepEqual(readImportManifest(root), manifest);
  rmSync(path.join(root, "source-provenance.json"));
  write(".git/external-manifest.json", JSON.stringify(manifest));
  symlinkSync(".git/external-manifest.json", path.join(root, "source-provenance.json"));
  const originalTarget = readFileSync(path.join(root, ".git/external-manifest.json"), "utf8");
  assert.throws(() => readImportManifest(root), /ELOOP|symbolic link/);
  assert.throws(() => writeImportManifest(root, manifest), /ELOOP|symbolic link/);
  assert.equal(readFileSync(path.join(root, ".git/external-manifest.json"), "utf8"), originalTarget);
  rmSync(path.join(root, "source-provenance.json"));
  const approved = structuredClone(manifest);
  approved.releaseEligible = true;
  assert.throws(() => verifyImportManifest(root, approved), /Release-Freigabe/);
  symlinkSync("README.md", path.join(root, "alias.txt"));
  assert.throws(() => makeImportManifest(root), /Symlink/);
  rmSync(path.join(root, "alias.txt"));
  write("frontend/demo/index.html", "Nicht im Kern\n");
  assert.throws(() => makeImportManifest(root), /Ausgeschlossene Quelle/);
  console.log("Importvertrag: geänderte, zusätzliche oder lokal versteckte Dateien, Scope-Erweiterung, Manifest-Symlinks und unzulässige Freigabe erfolgreich abgewehrt.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
