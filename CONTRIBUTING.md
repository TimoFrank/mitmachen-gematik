# Zum gematik-Kern beitragen

Der Umfang dieses Repositorys bleibt auf Versorgungs-Kompass und Hospitations-Kompass begrenzt. Die [Arbeitsregeln](AGENTS.md) und [Entwicklungsanleitung](dokumentation/gematik/ENTWICKLUNG_UND_QA.md) gelten für jede Änderung.

## Lokal vorbereiten

```bash
npm ci
npx --no-install playwright install chromium
API_BASE_URL=https://target.example.invalid npm run build:target
```

Für die Prüfungen werden Node.js, npm und Docker benötigt. Die gebauten Dateien allein bilden keine funktionierende OIDC-, API- und Datenbankumgebung.

## Review und Integration

Eine kohärente Änderung erhält einen benannten Branch und einen Pull Request. Vor der Integration:

```bash
npm run manifest:import
npm run verify:import
npm run qa:full
```

Das Importmanifest nach bewussten Quelländerungen aktualisieren. Dateiinventar und Prüfsummen zusammen mit dem fachlichen Diff prüfen. Es dokumentiert den Quellbestand und erteilt keine Release-Freigabe.

PR und Commit-Texte werden auf Deutsch verfasst. Nur zugehörige Dateien stagen. Keine generierten `dist/`-Dateien, Secrets, Tokens oder echten Fachdaten committen. Sicherheitslücken nach [SECURITY.md](SECURITY.md) melden.

Ein Merge auf GitHub erstellt keinen Release-Tag und führt keinen GitLab-Import oder GKE-Rollout aus. [Übernahme und Updates](dokumentation/gematik/RELEASE_UND_UPDATES.md) trennen diese Schritte.
