import { makeImportManifest, writeImportManifest } from "./lib/import-source.mjs";

const manifest = makeImportManifest(process.cwd());
writeImportManifest(process.cwd(), manifest);
console.log(`Importmanifest aktualisiert: ${manifest.files.length} Quelldateien. Noch keine Release-Freigabe.`);
