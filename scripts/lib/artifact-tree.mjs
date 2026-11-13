import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function artifactFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Artefakte dürfen keine Symlinks enthalten.");
    return entry.isDirectory() ? artifactFiles(root, full) : [path.relative(root, full).split(path.sep).join("/")];
  }).sort();
}

export function artifactDigest(root) {
  const files = artifactFiles(root).filter((file) => file !== "build-manifest.json");
  const hash = createHash("sha256");
  const length = (value) => {
    const frame = Buffer.alloc(8);
    frame.writeBigUInt64BE(BigInt(value));
    return frame;
  };
  hash.update(Buffer.from("versorgungs-kompass-artifact-tree-v2\0"));
  hash.update(length(files.length));
  for (const file of files) {
    const name = Buffer.from(file);
    const bytes = readFileSync(path.join(root, file));
    hash.update(length(name.length));
    hash.update(name);
    hash.update(length(bytes.length));
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}
