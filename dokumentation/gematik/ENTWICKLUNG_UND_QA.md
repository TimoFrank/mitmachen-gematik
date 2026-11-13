# Entwicklung und QA

Stand: 13. November 2026

Dieses Repository prüft ausschließlich den gematik-Kern. Die breite Anwendung und ihre Demo werden im Originalrepo weiterentwickelt. Änderungen erfolgen nach den [Arbeitsregeln](../../AGENTS.md) auf einem benannten Branch und per Pull Request.

## Lokal vorbereiten

Node.js 22, npm und Docker bereitstellen. Chromium für die Browserprüfung einmalig installieren:

```bash
npm ci
npx --no-install playwright install chromium
API_BASE_URL=https://target.example.invalid npm run build:target
```

`dist/target/` enthält das Frontend. Für eine funktionale Prüfung werden zusätzlich eine passende API, synthetische Datenbank und OIDC-Prüfumgebung benötigt. Ein statischer Build prüft weder Anmeldung noch Speicherung.

## Prüfungen im Kernrepo

| Zweck | Befehl |
| --- | --- |
| Kleine lokale Dokumentationsprüfung | `npm run qa:small` und `npm run check:docs-language` |
| Kern-, API-, Container- und Artefaktverträge | `npm run check:target-release` |
| Browserprüfung des Kerns | `npm run test:gematik-ui` |
| Vollprüfung vor PR und Integration | `npm run qa:full` |

Sichtbare Änderungen im echten Browser prüfen. Desktop und relevante mobile Zustände erhalten anklickbare Screenshot-Vorschauen. Nur synthetische Daten verwenden. Eigene Browser und Testserver danach schließen.

## Nachweise der Funktionsgrenze

Der Build enthält die beiden Kompasse und notwendige gemeinsame Funktionen. Direkte URLs entfallener Bereiche dürfen deren Arbeitsansichten nicht öffnen. Die API sperrt Stakeholder-, Format-, TYPO3- und Registrierungsrouten. Der Artefaktbaum enthält keine öffentlichen Registrierungsseiten, Demo-Daten, öffentlichen Politikdaten oder private Identitätsdateien.

Kernschema und Rollen müssen die Fachabläufe tragen. Die Tests führen keine automatische Löschung eines bestehenden Gesamtbestands aus. Testberichte und `dist/` bleiben unversioniert.

## Zusätzlich vor dem Zielbetrieb

Die institutionelle Abnahme umfasst Frontend und Login, anonyme Ablehnung, manipulierte oder unbekannte Tokens, Netzisolation, Lese- und Schreibrolle, synthetisches CRUD mit Bereinigung, DB-Stichprobe und isolierten Restore. Ein technischer Jenkins-Smoke allein genügt nicht.

[SECURITY.md](../../SECURITY.md) ergänzt die blockierenden Scanner-, SBOM- und Attestationsgates. Fehlende zentrale Nachweise sperren das Deployment. `not-run` ist nur für lokale Vorprüfungen zulässig. Eine erfolgreiche Vollprüfung oder Integration erstellt weder einen Release-Tag noch eine Betriebsfreigabe.
