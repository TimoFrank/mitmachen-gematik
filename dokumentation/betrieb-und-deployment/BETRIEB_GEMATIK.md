# Betrieb bei gematik auf GKE

Stand: 13. November 2026
Status: Vorbereitung. Ein freigegebener Betrieb bei gematik ist noch nicht nachgewiesen.

Betrieben werden Versorgungs-Kompass und Hospitations-Kompass mit gemeinsamer Kontakt-, Organisations- und Profilgrundlage. Die [Ausbaumatrix](../gematik/ANWENDUNG.md#grenze-des-kerns) grenzt diese Anwendung vom breiten Originalprojekt ab.

## Aufbau

```text
Interne HTTPS-Adresse hinter institutionellem OIDC-Gateway
  /       statisches Target-Frontend
  /api    Node.js-API im GKE-Namespace
            dedizierte PostgreSQL-16-Datenbank
            optional freigegebene Bestandsdateien
```

Frontend und API verwenden denselben Origin. Das Gateway entfernt Browser-Identitätsheader und übergibt ein frisch geprüftes, signiertes JWT als Bearer-Token. Die abgeschirmte API prüft Token, aktives Profil und Rolle. Ein reines Cookie-Gateway erfüllt diesen Vertrag nicht.

## Vor der Bereitstellung festlegen

| Thema | Verantwortung |
| --- | --- |
| GKE-Projekt, Namespace, Registry und geschützter Deploymentzugang | Plattformteam |
| Interne URL, TLS, Frontend-Hosting und Gateway-Netzbereiche | Plattform- und Identity-Team |
| OIDC-Issuer, Audience, JWKS und Testidentitäten | Identity-Team |
| Datenbank, Secrets, Sicherung, Restore und Schemaänderungen | Datenbank- und Plattformteam |
| Nutzerkreis, Rollen, Datenklassen und Aufbewahrung | Fachliche Verantwortung und Datenschutz |
| Updates, Monitoring, Störungen und Betriebsfreigabe | Anwendungs- und Betriebsverantwortung |

Der geplante Pilot mit ungefähr fünf Kolleginnen und Kollegen über etwa sechs Monate benötigt die Entscheidungen aus [Datenschutz und Compliance](../gematik/DATENSCHUTZ_UND_COMPLIANCE.md). Bis dahin wird ausschließlich synthetisch abgenommen.

## Bereitstellung

1. Den geprüften Kernstand nach [Übernahme und Updates](../gematik/RELEASE_UND_UPDATES.md) nach GitLab importieren und dessen institutionelle Quellverantwortung bestätigen.
2. Gateway, Frontend-Hosting, GKE-Namespace, Registry, Secrets und PostgreSQL einrichten. Das [Kern-Datenbankverfahren](../../deploy/postgres/gematik-core/README.md) verwenden. Keinen privaten Gesamtbestand ungeprüft importieren.
3. Einen freigegebenen signierten Quellstand verifizieren. Frontend und API daraus frisch bauen. Security-, Container-, Artefakt- und Helm-Gates erfolgreich nachweisen.
4. API über den nachgewiesenen Image-Digest und Frontend über das zugehörige Manifest im bestätigten Zielkontext aktivieren.
5. Die folgende Abnahme durchführen. Version, Commit, Digests, Schema, Konfiguration, Zielumgebung und Ergebnis gemeinsam protokollieren.

Das Target-Chart liefert derzeit die API. Es erstellt weder Datenbank noch vollständiges Frontend-Hosting und führt keinen Datenimport aus. Die [Referenzpipeline](../../deploy/jenkins/Jenkinsfile.gematik) ersetzt die institutionelle Plattformanbindung nicht.

## Erforderliche reale Zielprüfungen

| Bereich | Abnahme |
| --- | --- |
| Betrieb | `/api/healthz`, `/api/readyz`, Rollout und interne Erreichbarkeit |
| Anmeldung | Frontend/Login, aktive Profilbindung, anonyme Ablehnung, manipulierte oder unbekannte Tokens |
| Isolation | API nicht am Gateway vorbei erreichbar, keine Übernahme unbestätigter Browser-Identitätsheader |
| Rollen | Benannte Lese- und Schreibrolle mit erwarteten Rechten |
| Fachablauf | Synthetischer Kontakt- und Hospitationsablauf, Export, Bereinigung und DB-Stichprobe |
| Entfallene Bereiche | Kein Stakeholder-/Format-Arbeitsbereich, TYPO3-Intake oder öffentliche Registrierung über direkte URL oder API |
| Wiederherstellung | Erfolgreiche Sicherung und praktisch geprüfter isolierter Restore |

Ein technischer Jenkins-Smoke oder `validate_only` bestätigt keine vollständige Betriebsabnahme. Echte Fachdaten werden erst nach Freigabe getrennt übernommen und über Umfang, Mengen und Fingerprint bestätigt. Persönliche IAP-Zuordnungen und Daten entfallener Module werden nicht übernommen.

## Wartung und Störung

Mindestens Readiness, Pod-Neustarts, Datenbankverbindungen und erfolgreiche Sicherungen überwachen. Alarmempfänger, Intervalle, Aufbewahrung, Wiederherstellung sowie Secret- und Zertifikatsrotation intern vereinbaren. Logs und technische Nachweise enthalten keine Fachdaten, Tokens oder OIDC-Subjects.

Updates durchlaufen Review, Release und dieselben Target-Gates. Schemaänderungen werden kontrolliert ausgeführt. Die API migriert beim Start nicht automatisch. Vor jedem Update Kompatibilität und Rückweg prüfen.

Bei einer Störung zuerst Rollout, Pods, Gateway und Datenbankverbindung prüfen. Bei falschen Rechten oder vermuteter Datenbeschädigung den Zugang kontrolliert sperren. Der Software-Rückweg aktiviert die letzte abgenommene Kombination aus API-Digest, Frontend und Konfiguration. Helm stellt Frontend und Datenbank nicht automatisch zurück. Ein alter Dump ist nach neuen Schreibvorgängen kein verlustfreier Rückweg.

Cloud Run, die öffentliche Demo und lokale Mac-Varianten des Originalprojekts sind keine Zielbetriebsschritte oder Rückfallumgebung für gematik-Daten. [Architektur](../gematik/ARCHITEKTUR_UND_DATEN.md), [QA](../gematik/ENTWICKLUNG_UND_QA.md) und [Security](../../SECURITY.md) ergänzen die technischen Verträge.
