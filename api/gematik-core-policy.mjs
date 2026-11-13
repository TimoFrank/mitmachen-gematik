// Gemeinsamer Umfang für OIDC-API, Schema und Export. Kein Browserflag.
export const CORE_TABLES = Object.freeze([
  "profiles", "identity_bindings", "test_access_objects", "organizations", "contacts",
  "organization_primary_systems", "contact_owners", "activity_events", "changes", "import_runs",
  "contact_notes", "contact_note_attachments", "saved_views", "user_settings",
  "hospitation_slots", "hospitations", "hospitation_observations", "hospitation_observation_changes",
  "roadmap_items", "hospitation_roadmap_assessments", "hospitation_unmet_needs",
  "notification_events", "notification_recipients"
]);

const corePaths = [
  /^\/(?:api\/)?(?:healthz|readyz)$/,
  /^\/api\/(?:session|profile|profiles|export|contacts|contact-content-search|organizations|organization-primary-systems|contact-notes|contact-note-attachments|saved-views|user-settings|hospitation-slots|hospitations|hospitation-observations|roadmap-items|hospitation-roadmap-assessments|hospitation-unmet-needs|activities|notifications)$/,
  /^\/api\/ops\/(?:summary|checks)$/,
  /^\/api\/admin\/hospitation-import\/(?:preview|apply)$/,
  /^\/api\/(?:contacts|organizations|organization-primary-systems|contact-notes|contact-note-attachments|saved-views|hospitation-slots|hospitations|hospitation-observations)\/[^/]+$/,
  /^\/api\/contacts\/[^/]+\/(?:history|image)$/,
  /^\/api\/(?:profile-avatar|contact-images)\/[^/]+$/,
  /^\/api\/profile\/avatar$/,
  /^\/api\/contact-note-attachments\/[^/]+\/content$/,
  /^\/api\/hospitations\/[^/]+\/(?:observations\/sync|roadmap-assessments|unmet-needs)$/,
  /^\/api\/(?:activities|notifications)\/summary$/,
  /^\/api\/notifications\/(?:read|[^/]+\/read)$/
];

export function coreRouteAllowed(method, pathname) {
  // Methoden und Rollen prüft zusätzlich die zentrale Security-Policy.
  return typeof pathname === "string" && corePaths.some(pattern => pattern.test(pathname));
}
