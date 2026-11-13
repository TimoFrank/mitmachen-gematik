# Datenschutz und Compliance

Stand: 13. November 2026
Status: Ausfüllhilfe und offene Freigabepunkte. Keine institutionelle Freigabe.

Diese Seite beschreibt den vorgesehenen Einsatz für das interne Compliance-Datenblatt. Das verbindliche Formular, die Entscheidung und personenbezogene Anlagen werden im vorgesehenen internen Verfahren geführt. Interne Vorgangskennungen und ausgefüllte Betriebsunterlagen gehören nicht in dieses Quellrepository.

## Vorgesehener Einsatz

| Feld | Planungsstand |
| --- | --- |
| Anwendung | Versorgungs-Kompass und Hospitations-Kompass mit gemeinsamer Kontakt-, Organisations- und Profilgrundlage |
| Zweck | Berufliche Versorgungskontakte pflegen und Hospitationen vorbereiten, dokumentieren und auswerten |
| Nutzerkreis | Ungefähr fünf benannte Kolleginnen und Kollegen |
| Zeitraum | Zunächst etwa sechs Monate. Beginn und Ende noch zu bestätigen |
| Zielbetrieb | GKE/Kubernetes mit institutioneller OIDC-Anmeldung |
| Daten | Echte berufliche Kontakte und Organisationen sowie sachliche Hospitationsinhalte |
| Datenbegrenzung | Keine identifizierenden Patienten- und Gesundheitsdaten, personenbezogenen Fallbeschreibungen oder privaten Kontaktdossiers |
| Freigabestand | Datenschutz-, Informationssicherheits- und Betriebsfreigaben sind nicht nachgewiesen |

Berufliche Kontaktdaten sind nicht anonym. Freie Notizen, Hospitationsbeobachtungen und Exporte können Personenbezug enthalten und benötigen klare Regeln.

## Vor Echtdaten zu klären

| Thema | Erforderliche Entscheidung oder Nachweis | Zuständigkeit |
| --- | --- | --- |
| Auftrag und Zweck | Aufgabenbezug, zulässige Datenklassen und Umfang der Hospitationsdokumentation bestätigen | Noch festzulegen |
| Rechtsgrundlage und Transparenz | Grundlage, Informationspflichten und Hinweise bestätigen. Einwilligungszwecke getrennt behandeln | Noch festzulegen |
| Rollen und Nutzer | Benannte Personen sowie erforderliche Sicht- und Schreibrechte festlegen | Noch festzulegen |
| Aufbewahrung und Rechte | Fristen, Bestandsprüfung, Auskunft, Berichtigung, Sperrung und Löschung einschließlich Exporten und Sicherungen festlegen | Noch festzulegen |
| Plattform und externe Dienste | Regionen, Verträge und Verbindungen zu Karten- oder Speicheranbietern prüfen | Noch festzulegen |
| Betrieb | Sicherung, Restore, Monitoring, Störungsweg, Updates und Beendigung des Piloten vereinbaren | Noch festzulegen |
| Freigabe | Entscheidung für Umfang und Zeitraum, Auflagen und Reviewtermin dokumentieren | Noch festzulegen |

Bis diese Punkte bestätigt sind, bleibt die Abnahme synthetisch. Ein grüner Quelltest, ausgefülltes Formular oder bereitgestellter Container ersetzt keine Freigabe für echte Daten.

## Datenregeln im Alltag

Nur erforderliche berufliche Angaben und sachliche Beobachtungen erfassen. Keine identifizierenden Patientenszenen, Diagnosen, Gesundheitsangaben oder wertenden Personenprofile dokumentieren. Quelleninformationen und eigene Einordnungen auseinanderhalten. Exporte nur für berechtigte Empfänger erzeugen und geschützt behandeln.

Technische Prüfungen zeigen Rollenprüfung und Datenisolation. Sie bewerten keine Rechtsgrundlage. Neue Nutzungszwecke, Nutzergruppen, Datenklassen oder Schnittstellen benötigen eine erneute Prüfung. Die konkreten Zuständigkeiten sind noch zu vereinbaren.
