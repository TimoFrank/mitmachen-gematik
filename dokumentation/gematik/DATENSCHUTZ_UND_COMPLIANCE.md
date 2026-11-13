# Datenschutz und Compliance

Stand: 13. November 2026
Status: Ausfüllhilfe und offene Freigabepunkte. Keine institutionelle Freigabe.

Diese Seite beschreibt ausschließlich den reduzierten gematik-Kern und seinen vorgesehenen Einsatz für das interne Compliance-Datenblatt. Die breite Originalanwendung und ihre öffentliche Demo bleiben davon getrennt. Das verbindliche Formular, die Entscheidung und personenbezogene Anlagen werden im vorgesehenen internen Verfahren geführt. Interne Vorgangskennungen, personenbezogene Anlagen und ausgefüllte Betriebsunterlagen gehören nicht in dieses Quellrepository. Seine private GitHub-Sichtbarkeit ist keine Freigabe für Betriebsdaten.

## Angaben zum vorgesehenen Einsatz

| Feld | Tatsächlicher Planungsstand |
| --- | --- |
| Anwendung | Versorgungs-Kompass und Hospitations-Kompass |
| Zweck | Interne Pflege beruflicher Versorgungskontakte sowie Vorbereitung, Dokumentation und Auswertung von Hospitationen |
| Nutzerkreis | Ungefähr fünf benannte Kolleginnen und Kollegen |
| Zeitraum | Zunächst etwa sechs Monate, Beginn und konkretes Ende noch zu bestätigen |
| Zielbetrieb | GKE/Kubernetes in Verantwortung von gematik, institutionelle OIDC-Anmeldung |
| Daten | Echte berufliche Kontakte und Organisationen sowie sachliche Hospitationsinhalte |
| Ausgeschlossen | Identifizierende Patienten- und Gesundheitsdaten, personenbezogene Fallbeschreibungen und private Kontaktdossiers |
| Entfallener Umfang | Stakeholder-Kompass, Format-Kompass, TYPO3-Anbindung und öffentliche Registrierung |
| Weitere Integrationen | Kein aktiver Survalyzer-Connector. Private Google-/Mac-Dienste sind kein Zielbestandteil |
| Freigabestand | Institutionelle Datenschutz-, Informationssicherheits- und Betriebsfreigaben sind nicht nachgewiesen |

Die Begrenzung auf berufliche Kontaktdaten macht den Bestand nicht anonym. Freie Notizen, Hospitationsbeobachtungen und Exporte können Personenbezug enthalten und benötigen klare Regeln.

## Vor Echtdaten verbindlich klären

| Thema | Erforderlicher Nachweis | Zuständigkeit |
| --- | --- | --- |
| Auftrag und Zweck | Bestätigter Aufgabenbezug, zulässige Datenklassen und Umfang der Hospitationsdokumentation | Fachliche Verantwortung |
| Rechtsgrundlage und Transparenz | Bestätigte Grundlage, Informationspflichten und freigegebene Hinweise. Einwilligungszwecke getrennt behandeln | Datenschutz und Legal/Compliance |
| Rollen und Nutzer | Benannte Personen, erforderliche Sicht- und Schreibrechte, keine pauschale Vollsicht allein durch Administration | Fachliche Verantwortung und IT |
| Aufbewahrung und Rechte | Fristen, regelmäßige Bestandsprüfung sowie Auskunft, Berichtigung, Sperrung und Löschung einschließlich Exporten und Sicherungen | Fachliche Verantwortung und Datenschutz |
| Plattform und externe Dienste | GKE-/Datenbankverantwortung, Regionen, Verträge und geprüfte Verbindungen zu Karten- oder Speicheranbietern | Betrieb, Informationssicherheit und Datenschutz |
| Betriebsfähigkeit | Sicherung, geprüfter Restore, Monitoring, Störungsweg, Updates und Beendigung des Piloten | Betrieb und Anwendungsverantwortung |
| Freigabe | Bestätigte Entscheidung für genau diesen Umfang und Zeitraum, Auflagen und Reviewtermin | Zuständige institutionelle Freigaberollen |

Vor der Bestätigung dieser Punkte bleibt die Zielabnahme synthetisch. Ein persönlicher Vorbetrieb, grüner Quelltest, befülltes Formular oder bereitgestellter Container ersetzt keine Freigabe für echte Daten.

## Praktische Datenregeln

Nur für den Zweck erforderliche berufliche Angaben und sachliche Beobachtungen erfassen. Keine identifizierenden Patientenszenen, Diagnosen, Gesundheitsangaben oder wertenden Personenprofile dokumentieren. Informationen aus Quellen und eigene Einordnungen auseinanderhalten. Kontakt- und Hospitationsexporte nur für berechtigte Empfänger erzeugen und geschützt behandeln.

Die technischen Nachweise zeigen Rollenprüfung, Datenisolation und ausgeschlossene Zielrouten. Sie bewerten keine Rechtsgrundlage. Neue Nutzungszwecke, Nutzergruppen, Datenklassen oder Schnittstellen benötigen eine erneute Prüfung.

## Vorhandener Hintergrund

Die älteren [Datenschutz-Entscheidungsunterlagen](https://github.com/TimoFrank/mitmachen/blob/main/dokumentation/rechtliches/entscheidungsvorlage/README.md), die [Datenschutzrecherche](https://github.com/TimoFrank/mitmachen/blob/main/dokumentation/rechtliches/VERSORGUNGSKOMPASS_DATENSCHUTZ_EINWILLIGUNG_RECHERCHE.md) und das [Survalyzer-Konzept](https://github.com/TimoFrank/mitmachen/blob/main/dokumentation/rechtliches/SURVALYZER_SCHNITTSTELLE_DATENSCHUTZ_IT_FREIGABE.md) sind Quellen früherer Überlegungen. Sie beschreiben teilweise einen breiteren Umfang und belegen keine aktuelle Freigabe. Ihr Inhalt wird nur nach Abgleich in das tatsächliche interne Datenblatt übernommen.
