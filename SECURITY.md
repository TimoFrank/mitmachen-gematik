# Sicherheit

Stand: 13. November 2026

Ein vorbereiteter Quellstand oder erfolgreicher lokaler Test bestätigt keine institutionelle Datenschutz-, Informationssicherheits- oder Betriebsfreigabe.

## Sicherheitslücke melden

Bis ein institutioneller Kontakt benannt ist, über das [GitHub-Profil des Maintainers](https://github.com/TimoFrank) einen privaten Kontaktweg vereinbaren. Keine technischen Einzelheiten, echten Datensätze, Tokens oder Zugangsdaten öffentlich melden. Eine Meldung nennt Version, betroffenen Bereich, Auswirkung und Schritte zum Nachstellen.

## Quelle und Release

Vor und nach dem Repository-Import den erwarteten Branch, vollständigen Commit-SHA und vorhandene Tags vergleichen. Ein PAT dient nur dem geschützten Importzugang und gehört weder in Git noch in Dokumentation, URLs oder Logs.

Der vorbereitende Stand erhält noch keinen Release-Tag. Der Herkunftsnachweis ist keine Signatur und bleibt mit `releaseEligible: false` gekennzeichnet. Vor einem späteren Release Quell-URL, Tagobjekt, Commit, Signatur und unabhängig bestätigten Fingerprint nachweisen. Private Signierschlüssel werden nicht übertragen.

## Pflichtprüfung nach OWASP Top 10

**Status: ausstehend.** Die Anwendung muss anhand der [OWASP Top 10:2025](https://top10.owasp.org/2025/de/) sicherheitsgeprüft werden. Diese Anforderung ist hier dokumentiert. Die eigentliche Prüfung erfolgt gesondert.

| Risikogruppe | Zu prüfender Bereich |
| --- | --- |
| A01:2025 | Zugriffsrechte und Schutz vor unberechtigtem Datenzugriff |
| A02:2025 | Sichere Konfiguration der Anwendung und Betriebsumgebung |
| A03:2025 | Abhängigkeiten, Buildwerkzeuge und Auslieferungskette |
| A04:2025 | Verschlüsselung, Schlüssel und Zertifikate |
| A05:2025 | Eingabeprüfung und Schutz vor eingeschleustem Code oder Abfragen |
| A06:2025 | Sicherheitsanforderungen im Anwendungsentwurf |
| A07:2025 | Anmeldung, Identitätsprüfung und Sitzungen |
| A08:2025 | Unveränderte Software, Daten und vertrauenswürdige Artefakte |
| A09:2025 | Sicherheitsprotokolle und Alarmierung |
| A10:2025 | Kontrollierte Behandlung von Fehlern und Ausnahmesituationen |

Die Prüfung umfasst Oberfläche, API, Datenzugriffe, Buildkette und die vorgesehene Zielkonfiguration. Der spätere Nachweis nennt Katalogversion, Quellcommit, Artefaktdigests, Prüfumgebung, Datum, Befunde und Maßnahmen. Nicht anwendbare Punkte werden begründet. Zuständigkeit und Prüftermin sind noch festzulegen.

Historische OWASP-Unterlagen des Originalprojekts sind keine aktuelle Prüfung dieses Repositorys. Vorhandene Einzeltests und erfolgreiche Builds ersetzen den vollständigen Nachweis nicht.

## Blockierende technische Gates

| Prüfung | Verbindlicher Nachweis |
| --- | --- |
| Datenzugriff | Definierte API-Routen, serverseitige Rechte und Datenisolation |
| OWASP Top 10 | Dokumentierte Prüfung aller zehn Risikogruppen für den konkreten Quellstand und die vorgesehene Zielkonfiguration |
| Abhängigkeiten und Quellcode | Schwachstellen-, Signatur-, SAST- und Secret-Prüfungen ohne blockierende Befunde |
| API-Image und Helm | Gepinnte Quellen, Non-Root-Containerstart, Health, gerenderte Konfiguration und Netzwerkgrenzen |
| Komponenten und Artefakte | SBOM für Oberfläche und API, Bindung an Quellcommit und tatsächliche Digests |
| Zentrale Software Factory | Buildgebundene SonarQube-, Snyk- und Dependency-Track-Gates sowie Cosign-Bereitschaft vor dem Registry-Push |
| Image-Attestation | Nach dem Push Cosign-Nachweis für den exakten veröffentlichten Image-Digest |

Fehlende, veränderte oder widersprüchliche Nachweise sperren das Deployment. `not-run` gilt nur für lokale Vorprüfungen. Eine selbst formulierte grüne Zusammenfassung ersetzt kein zentrales Analyseergebnis.

## Reale Abnahme und Wartung

In der Zielumgebung Oberfläche und Login, anonyme Ablehnung, manipulierte oder unbekannte Tokens, Netzisolation, zwei Rollen, synthetisches CRUD mit Bereinigung, DB-Stichprobe und Restore prüfen. Die API darf nur über das Gateway erreichbar sein. Ein technischer Jenkins-Smoke allein schließt die Abnahme nicht ab.

Zuständigkeiten und Kontaktwege für Anwendung, Betrieb und Sicherheitsmeldungen sind noch festzulegen. Vor dem Pilotstart Updates und Bewertung neuer Befunde vereinbaren. Bei einem relevanten hohen oder kritischen Befund kann die Nutzung bis zur Klärung pausiert werden.

[Übernahme und Updates](dokumentation/gematik/RELEASE_UND_UPDATES.md), [Betrieb](dokumentation/betrieb-und-deployment/BETRIEB_GEMATIK.md) und [Datenschutz und Compliance](dokumentation/gematik/DATENSCHUTZ_UND_COMPLIANCE.md) beschreiben die weiteren Entscheidungen. Betriebsdaten, Backups, persönliche Werte und OIDC-Subjects bleiben außerhalb des Repositorys und technischer Berichte.
