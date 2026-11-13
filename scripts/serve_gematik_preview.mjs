import http from "node:http";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

const root = realpathSync(path.resolve(process.env.GEMATIK_PREVIEW_ROOT || "dist/target"));
const port = Number(process.env.PLAYWRIGHT_PORT || 4197);
const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".wasm": "application/wasm", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (!["GET", "HEAD"].includes(request.method) || pathname.startsWith("/api/")) { response.writeHead(404).end(); return; }
  const appRoute = /^\/(?:start|versorgung(?:\/.*)?|hospitationskompass(?:\/.*)?|hospitationen(?:\/.*)?|profil(?:\/.*)?|teams|einstellungen|kontakt\/[^/]+|organisation\/[^/]+)$/.test(pathname);
  const relative = appRoute ? "versorgungs-kompass.html" : pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !existsSync(file) || !statSync(file).isFile() || !realpathSync(file).startsWith(`${root}${path.sep}`)) { response.writeHead(404).end(); return; }
  response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(request.method === "HEAD" ? undefined : readFileSync(file));
});
server.listen(port, "127.0.0.1", () => console.log(`Lokale Target-Vorschau auf http://127.0.0.1:${port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
