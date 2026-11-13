# PostgreSQL für den gematik-Kern

Die Dateien definieren ausschließlich Versorgung, Kontakte, Organisationen und
Hospitationen mit den benötigten Profilen, Notizen und Auditdaten. Experten,
Stakeholder, Politik, Formate und öffentliche Registrierungen sind kein Teil
dieses Schemas. Private Anmelde- und Mac-Abgleichtabellen werden nicht angelegt.

Für die Erstinstallation eine neue dedizierte PostgreSQL-16-Datenbank verwenden.
Zuerst `runtime-role.sql`, danach `schema.sql` als Objekt-Owner und schließlich
`grants.sql` mit `-v runtime_role=vk_app_runtime` ausführen. Ein eigener Login
erhält nur die Mitgliedschaft in dieser NOLOGIN-Rolle. Die Rolle darf weder
Objekt-Owner noch Administrator sein. Die API führt keine Migrationen aus.

`../poc-gematik/bind-oidc-identity.sql` bindet freigegebene OIDC-Identitäten.
Echte Subjects, Daten und Passwörter bleiben außerhalb des Repositories.
Ein Import benötigt eine eigene Freigabe und eine zum Kern passende Allowlist.
Das Schema ist kein Löschskript für bestehende private oder institutionelle Daten.
