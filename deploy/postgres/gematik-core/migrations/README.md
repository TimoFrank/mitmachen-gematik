# Migrationen des gematik-Kerns

Der erste Kernstand wird ausschließlich in einer neuen dedizierten Datenbank mit
`../schema.sql` eingerichtet. Die private Datenbank wird dadurch nicht verändert.
Es gibt noch keine Folgemigration. Neue Änderungen erhalten eigene versionierte
SQL-Dateien und werden nach Sicherung separat angewendet.
