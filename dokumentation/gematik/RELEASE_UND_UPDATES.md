# Übernahme und Updates

Stand: 13. November 2026

Das private GitHub-Repo [mitmachen-gematik](https://github.com/TimoFrank/mitmachen-gematik) stellt die reduzierte Quellbasis bereit. Das [Originalrepo mitmachen](https://github.com/TimoFrank/mitmachen) bleibt mit vier Kompassen und öffentlicher Demo aktiv. Nach dem geprüften Import führt das institutionelle GitLab ausschließlich den gematik-Betriebsstand.

## Vorbereitung auf GitHub

Den Kernstand vollständig prüfen, per PR auf `main` integrieren und den vollständigen Commit-SHA dieses Stands festhalten. Der vorbereitende Stand ist noch kein signierter Zielrelease. Es wird dafür kein Release-Tag erzeugt. Der Herkunftsnachweis mit `releaseEligible: false` dokumentiert die Ableitung, ersetzt aber keine Freigabe.

## Privates Repository per URL importieren

1. Auf der Zielinstanz prüfen, dass **Repository by URL** als Importquelle aktiviert ist und die zuständige Person im Zielbereich die erforderlichen Rechte hat.
2. **New project/repository → Import project → Repository by URL** wählen. Als Quelle `https://github.com/TimoFrank/mitmachen-gematik.git` verwenden. Zielgruppe, Projektname und private Sichtbarkeit prüfen.
3. Für die private Quelle GitHub-Benutzername und einen kurzlebigen PAT mit Lesezugriff auf dieses Repository in die vorgesehenen Zugangsfelder eintragen. Den Token nicht in die URL einbetten und nicht in Git, Dokumentation oder Logs schreiben.
4. Import starten. Anschließend den vollständigen `main`-Commit-SHA und das vorhandene Taginventar mit der freigegebenen GitHub-Kernquelle vergleichen. Ein erfolgreicher URL-Import übernimmt deren Commits. Er erzeugt nicht automatisch einen neuen Quellcommit oder Release-Tag.
5. Importergebnis und institutionelle Quellverantwortung intern protokollieren. Die GitLab-Pipeline anschließend auf die bestätigte GitLab-Quell-URL und die geschützten Plattformwerte ausrichten.

Der Import ist ein gesonderter Bedienvorgang. Die vorliegende GitHub-Vorbereitung führt ihn nicht aus. Voraussetzungen und Zugangsfelder beschreibt die [offizielle GitLab-Anleitung](https://docs.gitlab.com/user/import/third_party_systems/repo_by_url/). Einzelne Optionen hängen von der Zielinstanz ab.

## Updates nach dem Import

GitLab ist für den institutionellen Betriebsstand führend. Verbesserungen aus dem Originalprojekt oder dem GitHub-Kernrepo werden gezielt als Änderungen mit Herkunftsnachweis und Merge Request übernommen. Umfang, Datenvertrag, Security und QA vor der Integration prüfen. Das Projekt für Updates nicht erneut importieren und nicht automatisch bidirektional spiegeln.

GitHub-Ausgangscommit, übernommene Änderung und GitLab-Commit nachvollziehbar verbinden. Beide Produktlinien können eigene Versionsstände haben. Ein Demo-Update oder ein Tag im breiten Originalprojekt aktualisiert den gematik-Betrieb nicht.

## Späterer Release und Betrieb

Erst nach institutioneller Prüfung und Freigabe einen geeigneten signierten, annotierten Produkt-Tag `vX.Y.Z` festlegen. Autoritative Quell-URL, Tagobjekt, Commit, Signatur und unabhängig bestätigten Fingerprint verifizieren. Frontend und API frisch aus demselben Tag bauen und über eigene Digests nachweisen.

Plattform- und Security-Gates sowie die vollständige [Zielabnahme](../betrieb-und-deployment/BETRIEB_GEMATIK.md#erforderliche-reale-zielprüfungen) bleiben verbindlich. Die Quellübernahme autorisiert weder echte Fachdaten noch ein GKE-Deployment. Alte RC.5-Tags des Originalprojekts sind keine Freigabe dieses Kerns. Die erste stabile Version `v1.0.0` benötigt eine ausdrückliche Entscheidung und ein verifiziertes Target-Deployment.

Vor Updates Frontend, API und Datenbankschema gemeinsam auf Kompatibilität prüfen. Ein Helm-Rollback stellt Frontend oder Datenbank nicht automatisch zurück. Nach fachlichen Schreibvorgängen ist ein alter Dump kein verlustfreier Rückweg.
