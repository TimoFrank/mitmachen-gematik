import { readImportManifest, verifyImportManifest } from "./lib/import-source.mjs";

const count = verifyImportManifest(process.cwd(), readImportManifest(process.cwd()));
console.log(`Importbestand erfolgreich geprüft: ${count} Quelldateien, unveränderte Herkunft und vollständige Prüfsummen.`);
