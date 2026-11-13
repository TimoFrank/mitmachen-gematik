# Sicherheit

Stand: 13. November 2026

Diese Richtlinie gilt für den reduzierten gematik-Kern. Ein vorbereiteter Quellstand oder erfolgreicher lokaler Test bestätigt keine institutionelle Datenschutz-, Informationssicherheits- oder Betriebsfreigabe.

## Sicherheitslücke melden

Bis ein institutioneller Kontakt benannt ist, über das [GitHub-Profil des Maintainers](https://github.com/TimoFrank) einen privaten Kontaktweg vereinbaren. Keine technischen Einzelheiten, echten Datensätze, Tokens oder Zugangsdaten öffentlich melden. Eine Meldung nennt Version, betroffenen Bereich, Auswirkung und Schritte zum Nachstellen.

## Quelle, Import und Release

`TimoFrank/mitmachen` bleibt das breite Entwicklungsrepo. Das private `TimoFrank/mitmachen-gematik` stellt den eigenständigen Kern bereit. Nach dem geprüften URL-Import ist das institutionelle GitLab für den gematik-Betriebsstand führend. Das Originalprojekt bleibt davon unabhängig aktiv.

Der Import übernimmt die Git-Commits des Kernrepos. Erwarteten Branch, vollständigen Commit-SHA und vorhandene Tags vor und nach dem Import vergleichen. Ein Benutzername oder PAT dient nur dem geschützten Importzugang und gehört weder in Git noch in Dokumentation, URLs oder Logs.

Der vorbereitende Stand erhält noch keinen Release-Tag. Der Herkunftsnachweis ist keine Signatur und bleibt mit `releaseEligible: false` gekennzeichnet. Vor einem späteren Release sind die autoritative Quell-URL, Tagobjekt, Commit, Signatur und ein unabhängig bestätigter Fingerprint nachzuweisen. Private Signierschlüssel werden nicht übertragen. Ein alter Tag aus der breiteren Anwendung bestätigt keinen nachträglich reduzierten Bestand.

## Blockierende technische Gates

| Prüfung | Verbindlicher Nachweis |
| --- | --- |
| Kernumfang und Datenisolation | Target-Artefaktaudit, serverseitige Routen- und Rollenprüfungen, keine Demo-Daten oder öffentliche Registrierung |
| Abhängigkeiten und Quellcode | Schwachstellen-, Signatur-, SAST- und Secret-Prüfungen ohne blockierende Befunde |
| API-Image und Helm | Gepinnte Quellen, Non-Root-Containerstart, Health, gerenderte Konfiguration und Netzwerkgrenzen |
| Komponenten und Artefakte | SBOM für Frontend und API, Bindung an Quellcommit und tatsächliche Digests |
| Zentrale Software Factory | Buildgebundene SonarQube-, Snyk- und Dependency-Track-Gates sowie Cosign-Bereitschaft vor dem Registry-Push |
| Image-Attestation | Nach dem Push Cosign-Nachweis für den exakten veröffentlichten Image-Digest |

Fehlende, veränderte oder widersprüchliche Nachweise sperren das Deployment. `not-run` ist ausschließlich für lokale Vorprüfungen zulässig. Eine selbst formulierte grüne Zusammenfassung ersetzt kein zentrales Analyseergebnis.

## Reale Abnahme und Wartung

In der Zielumgebung Frontend und Login, anonyme Ablehnung, manipulierte oder unbekannte Tokens, Netzisolation, zwei Rollen, synthetisches CRUD mit Bereinigung, DB-Stichprobe und Restore prüfen. Die API darf nicht am institutionellen Gateway vorbei erreichbar sein. Ein technischer Jenkins-Smoke allein schließt die Abnahme nicht ab.

Vor dem Pilotstart Verantwortliche für Anwendung, Plattform und Security-Meldungen benennen. Für den eingesetzten Kandidaten Updates und Bewertung neuer Befunde vereinbaren. Bei einem relevanten hohen oder kritischen Befund kann der Betrieb bis zur Klärung pausiert werden.

[Übernahme und Updates](dokumentation/gematik/RELEASE_UND_UPDATES.md), [Betrieb](dokumentation/betrieb-und-deployment/BETRIEB_GEMATIK.md) und [Datenschutz und Compliance](dokumentation/gematik/DATENSCHUTZ_UND_COMPLIANCE.md) beschreiben die weiteren Entscheidungen. Betriebsdaten, Backups, persönliche Werte und OIDC-Subjects bleiben außerhalb des Repositorys und technischer Berichte.
