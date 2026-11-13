# Architektur und Daten

Stand: 13. November 2026

Das Target besteht aus statischem Frontend, Node.js-API und dedizierter PostgreSQL-16-Datenbank. GKE betreibt die API. Das institutionelle Gateway stellt Frontend und API unter derselben internen HTTPS-Adresse bereit.

```text
Browser -> institutionelles OIDC-Gateway
             /       statisches Target-Frontend
             /api    Node.js-API auf GKE -> PostgreSQL
                                      -> optional freigegebene Bestandsdateien
```

| Grenze | Vertrag |
| --- | --- |
| Produktumfang | `gematik-core`: zwei Kompasse und ihre notwendige gemeinsame Grundlage |
| Browser | Fachdaten nur über die API. Keine Demo-Daten und keine Browser-Ersatzdatenbank |
| Identität | Gateway entfernt Browser-Identitätsheader und übergibt ein geprüftes signiertes JWT als Bearer-Token |
| Rechte | API prüft Token, aktives Profil, Rolle und erlaubte Aktion serverseitig |
| Datenbank | Eingeschränkte Laufzeitrolle, verschlüsselte Verbindung und kontrollierte Schemaänderungen |
| Dateien | Neue Uploads aus. Bestandsdateien nur nach gesonderter Speicher- und Übernahmeentscheidung |
| Artefakte | Frontend und API aus demselben freigegebenen Quellstand, Nachweis über Commit und eigene Digests |

Die API darf nicht unter Umgehung des Gateways erreichbar sein. Ein reines Cookie-Gateway oder browserseitiges OAuth ist kein Ersatz für den vorhandenen Bearer-JWT-Vertrag.

## Daten und Schnittstellen

Zum Kern gehören Organisationen, berufliche Kontakte, Profile und Rollen sowie Hospitationstermine, Framework-Zuordnungen, Beobachtungen und Auswertungsbezüge. Echte Fachdaten bleiben außerhalb von Git, Images, Buildmanifesten, Screenshots und technischen Prüfberichten.

Ein neuer Zielbestand startet mit dem geprüften Kernschema und synthetischen Daten. Eine spätere Übernahme beschränkt sich auf freigegebene Kern-Datenklassen. Abhängigkeiten, Mengen und Fingerprint werden geprüft. Persönliche Identitätszuordnungen und Daten entfallener Module bleiben draußen. Eine Datenübernahme oder Löschung wird durch die Quellbereitstellung nicht ausgeführt.

OIDC, Datenbankzugang, TLS und Gateway werden institutionell eingerichtet. Kartenanbieter, Zielhosts, Lizenz, Schlüssel und übertragener Datenumfang sind vor Nutzung zu bestätigen. Bestandsdateien können über den vorhandenen GCS-Adapter angebunden werden, benötigen aber eigene Plattformwerte und Freigabe. TYPO3, Survalyzer und private Google-/Mac-Dienste werden nicht automatisch aktiviert.

## Führende technische Quellen

- [API-Routengrenze und Kerntabellen](../../api/gematik-core-policy.mjs)
- [Kern-Datenbank](../../deploy/postgres/gematik-core/README.md)
- [Target-Konfiguration](../../config/target/deployment.json)
- [Helm-Overlay](../../deploy/helm/versorgungs-kompass/values-target-gematik.yaml)
- [Technische Referenzpipeline](../../deploy/jenkins/Jenkinsfile.gematik)

Konkrete Zielwerte, Zugangsdaten und Abnahmeprotokolle werden in der geschützten institutionellen Betriebsakte geführt. [Betrieb](../betrieb-und-deployment/BETRIEB_GEMATIK.md) und [Security](../../SECURITY.md) beschreiben die Voraussetzungen.
