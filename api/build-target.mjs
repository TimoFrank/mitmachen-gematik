import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, process.argv[2] || "dist/gematik-core-api");
mkdirSync(output, { recursive: true });
const privateAdapters = new Set([
  "./bundestag-health-committee.mjs", "./google-hosting.mjs", "./google-runtime.mjs",
  "./user-administration.mjs", "./user-administration-email.mjs", "./mac-sync-http.mjs",
  "./mac-sync-local.mjs", "./test-access-enrollment.mjs", "./typo3-registration-connector.mjs"
]);
const result = await build({
  absWorkingDir: root,
  entryPoints: ["api/server.mjs"],
  outfile: path.join(output, "server.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  define: { VK_CORE_ONLY: "true" },
  treeShaking: true,
  minifySyntax: true,
  metafile: true,
  legalComments: "eof",
  plugins: [{
    name: "private-adapters-outside-target",
    setup(builder) {
      // Private Quellen werden für den Target-Build nicht aufgelöst. Nach dem
      // Tree-Shaking muss jeder dieser Imports vollständig verschwunden sein.
      builder.onResolve({ filter: /^\.\// }, args => {
        if (args.importer === path.join(root, "api/server.mjs") && privateAdapters.has(args.path)) {
          return { path: args.path, external: true };
        }
      });
    }
  }]
});
const forbiddenInputs = /(?:google-|mac-sync|password-reset|user-administration|test-access-enrollment|typo3-registration|bundestag-health)/u;
const inputs = Object.entries(result.metafile.inputs)
  .filter(([input]) => Object.values(result.metafile.outputs).some(output => (output.inputs[input]?.bytesInOutput || 0) > 0))
  .map(([input]) => input);
if (inputs.some(input => forbiddenInputs.test(input))) throw new Error("Privater Adapter im gematik-API-Build.");
if (Object.values(result.metafile.outputs).some(output => output.imports.some(item =>
  item.external && item.path !== "pg" && !item.path.startsWith("node:")))) {
  throw new Error("Unerlaubter externer Import im gematik-API-Build.");
}
const source = readFileSync(path.join(output, "server.mjs"));
writeFileSync(path.join(output, "build-manifest.json"), JSON.stringify({
  scope: "gematik-core", authMode: "oidc", inputs,
  artifactDigest: `sha256:${createHash("sha256").update(source).digest("hex")}`
}, null, 2) + "\n");
copyFileSync(path.join(root, "api/package.target.json"), path.join(output, "package.json"));
copyFileSync(path.join(root, "api/package.target-lock.json"), path.join(output, "package-lock.json"));
console.log(`gematik-core API: ${source.length} Byte`);
