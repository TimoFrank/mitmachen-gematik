# PostgreSQL für die Anwendung

Stand: 13. November 2026

Das Schema speichert Versorgungskontakte, Organisationen und Hospitationen mit den benötigten Profilen, Notizen und Auditdaten.

## Erstinstallation

Eine neue dedizierte PostgreSQL-16-Datenbank verwenden. Die Einrichtung erfolgt in dieser Reihenfolge:

1. `runtime-role.sql` ausführen.
2. `schema.sql` als Objekt-Owner ausführen.
3. `grants.sql` mit `-v runtime_role=vk_app_runtime` ausführen.

Ein eigener Login erhält nur die Mitgliedschaft in dieser NOLOGIN-Rolle. Die Laufzeitrolle darf weder Objekt-Owner noch Administrator sein. Die API führt keine Migrationen aus. Spätere Schemaänderungen werden kontrolliert nach dem [Migrationsverfahren](migrations/README.md) angewendet.

## Identität und Datenübernahme

[`bind-oidc-identity.sql`](../poc-gematik/bind-oidc-identity.sql) bindet freigegebene OIDC-Identitäten. Echte Subjects, Daten und Passwörter bleiben außerhalb des Repositories.

Ein Datenimport benötigt eine eigene Freigabe und eine bestätigte Tabellen-Allowlist. Mengen, Abhängigkeiten und Fingerprint sind zu prüfen. Die Erstinstallation ist für eine neue Datenbank vorgesehen und verändert keine bestehenden Datenbestände.
