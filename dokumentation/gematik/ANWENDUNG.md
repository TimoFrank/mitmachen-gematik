# Anwendung und Zielumfang

Stand: 13. November 2026

Dieses Kernrepo umfasst Versorgungs-Kompass und Hospitations-Kompass für die interne Arbeit. Das [Originalprojekt](https://github.com/TimoFrank/mitmachen) bleibt mit allen vier Kompassen und seiner öffentlichen Demo aktiv.

| Bereich | Aufgabe |
| --- | --- |
| Versorgungs-Kompass | Berufliche Kontakte und Organisationen pflegen, suchen und regional auf der Karte einordnen |
| Hospitations-Kompass | Termine vorbereiten, Hospitationen dokumentieren, Beobachtungen im Framework ordnen und Ergebnisse auswerten oder exportieren |
| Gemeinsame Grundlage | Profile, serverseitige Rollen, zuständige Personen und nachvollziehbare Änderungen |

Die institutionelle OIDC-Anmeldung wird einem freigegebenen Profil zugeordnet. Die API prüft Rolle und Zugriff bei jeder Anfrage. Eine bestätigte Identität allein erteilt keine fachliche Berechtigung.

## Grenze des Kerns

| Bestandteil | Entscheidung |
| --- | --- |
| Kontakte, Organisationen, regionale Karte und benötigte Profile | Bleiben als gemeinsame Grundlage |
| Hospitationstermine, Framework, Beobachtungen und Auswertung | Bleiben als fachlicher Kern |
| Benötigte Importe und Exporte | Bleiben für die beiden Kernabläufe und nach jeweiliger Berechtigung |
| Stakeholder-Kompass und Format-Kompass | Kein aktiver Bereich oder Ziel-API-Vertrag |
| TYPO3-Connector, Registrierungs-Intake und öffentliche Registrierung | Kein aktiver Eingang oder öffentliche Registrierungsseite im Target |
| Öffentliches Politikverzeichnis | Bleibt beim getrennten Originalprojekt, kein Target-Datenbestand |
| Survalyzer, Cloud Run, IAP und Mac-Synchronisation | Keine Betriebsdienste dieses Kerns |
| Neue Bild- und Datei-Uploads | Bleiben deaktiviert. Bestandsdateien benötigen eine eigene Übernahmeentscheidung |

Diese Grenze gilt für Oberfläche, erreichbare API-Routen und Target-Artefakte. Ein ausgeblendeter Menüpunkt allein genügt nicht. Gemeinsam benötigte Quelldateien können noch abgegrenzten Code früherer Bereiche enthalten. Die Reduktion löscht weder bestehende Fachdaten noch Funktionen im Originalrepo.

## Fachliche Nutzung

Vor einer Hospitation Organisation, Ansprechperson, Termin und Kontext prüfen. Beobachtungen sachlich dokumentieren und mit ihrer Quelle verbinden. Erinnerung, beobachteter Sachverhalt und spätere Interpretation bleiben unterscheidbar. Die Auswertung kann daraus Muster und Hypothesen bilden.

Erfasst werden berufliche Kontakte und sachliche Hospitationsinhalte. Identifizierende Patienten- und Gesundheitsdaten sowie personenbezogene Fallbeschreibungen sind ausgeschlossen. Freie Notizen und Exporte benötigen dieselbe Sorgfalt wie strukturierte Felder.

Geplant ist ein interner Pilot mit ungefähr fünf benannten Kolleginnen und Kollegen über etwa sechs Monate. Dies ist keine institutionelle Freigabe. Die [Compliance-Ausfüllhilfe](DATENSCHUTZ_UND_COMPLIANCE.md) und [Betriebsanleitung](../betrieb-und-deployment/BETRIEB_GEMATIK.md) benennen die offenen Entscheidungen.
