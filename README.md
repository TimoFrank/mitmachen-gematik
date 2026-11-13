# Versorgungs-Kompass und Hospitations-Kompass

Stand: 13. November 2026

Dieses private Repository enthält die reduzierte Anwendung für die Übernahme durch gematik. Sie verbindet regionale Versorgungsarbeit mit der Vorbereitung, Dokumentation und Auswertung von Hospitationen. Kontakte, Organisationen, Profile und Rollen bilden die gemeinsame Grundlage.

Zielplattform ist **GKE/Kubernetes mit OIDC**. Stakeholder-Kompass, Format-Kompass, TYPO3-Anbindung und öffentliche Registrierung gehören nicht zum Zielumfang.

## Die drei Quellen

| Quelle | Aufgabe |
| --- | --- |
| [mitmachen](https://github.com/TimoFrank/mitmachen) | Weiterhin aktives Entwicklungsrepo mit allen vier Kompassen und vollständiger öffentlicher Demo |
| [mitmachen-gematik](https://github.com/TimoFrank/mitmachen-gematik) | Eigenständige, reduzierte Quellbasis für die institutionelle Übernahme |
| Institutionelles GitLab | Nach dem geprüften Import führende Quelle für den gematik-Betriebsstand |

Ein GitLab-Import, Release-Tag und Betrieb bei gematik sind für diesen vorbereitenden Stand noch nicht nachgewiesen. Die Herkunft aus der breiteren Anwendung ist dokumentiert. Deren Versionen und alte RC.5-Tags sind keine Freigabe dieser Kernanwendung. Der Herkunftsnachweis kennzeichnet die Vorbereitung mit `releaseEligible: false`.

## Die kurze Lesestrecke

| Aufgabe | Anleitung |
| --- | --- |
| Funktionen und Grenzen verstehen | [Anwendung](dokumentation/gematik/ANWENDUNG.md) |
| Aufbau und Daten prüfen | [Architektur und Daten](dokumentation/gematik/ARCHITEKTUR_UND_DATEN.md) |
| Datenschutz und Compliance klären | [Datenschutz und Compliance](dokumentation/gematik/DATENSCHUTZ_UND_COMPLIANCE.md) |
| Lokal entwickeln und prüfen | [Entwicklung und QA](dokumentation/gematik/ENTWICKLUNG_UND_QA.md) |
| GitLab-Import und Updates durchführen | [Übernahme und Updates](dokumentation/gematik/RELEASE_UND_UPDATES.md) |
| GKE-Betrieb vorbereiten und betreuen | [Betrieb](dokumentation/betrieb-und-deployment/BETRIEB_GEMATIK.md) |

Diese sechs Seiten und dieses README bilden die aktive Dokumentation. Der [breitere öffentliche Demonstrator](https://versorgungs-kompass.de/demo) bleibt beim Originalprojekt. Er belegt weder den reduzierten Umfang noch dessen Betriebsfreigabe.

Quellcode und technische Dokumentation stehen unter [Apache License 2.0](LICENSE). Für Daten und Marken gelten die [gesonderten Hinweise](dokumentation/rechtliches/DATA_NOTICE.md) und [Markenhinweise](dokumentation/rechtliches/NOTICE.md). Sicherheitsmeldungen folgen der [Sicherheitsrichtlinie](SECURITY.md).
