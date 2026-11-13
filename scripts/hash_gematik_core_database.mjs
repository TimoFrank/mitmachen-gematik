import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function gematikDatabaseDigest(directory = fileURLToPath(new URL("../deploy/postgres/gematik-core/", import.meta.url))) {
  const files = ["schema.sql", "runtime-role.sql", "grants.sql"];
  for (const entry of readdirSync(path.join(directory, "migrations"), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("Die Datenbankquellen dürfen keine Symlinks enthalten.");
    if (entry.isFile() && entry.name.endsWith(".sql")) files.push(`migrations/${entry.name}`);
  }
  const manifest = files.sort().map((file) => {
    const bytes = readFileSync(path.join(directory, file));
    return { file, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  return `sha256:${createHash("sha256").update(JSON.stringify(manifest)).digest("hex")}`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${gematikDatabaseDigest()}\n`);
}
