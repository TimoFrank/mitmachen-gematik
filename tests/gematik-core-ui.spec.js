import { test, expect } from "@playwright/test";
import { installAppTestSession, writeAppTestStorage } from "./helpers/app-test-session.js";

const removedApi = /\/api\/(?:expert-[a-z-]+|stakeholder-[a-z-]+|politics|formats|network-registrations|connectors|admin\/users)(?:\/|\?|$)/;

async function openCore(page, route = "home") {
  const requests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url());
  });
  await installAppTestSession(page, { role: "admin" });
  const artifactMode = process.env.GEMATIK_CORE_ARTIFACT_PREFIX !== undefined;
  await page.route("**/data/runtime-config.js*", async (request) => {
    if (artifactMode) {
      const response = await request.fetch();
      const original = await response.text();
      expect(original).toMatch(/productScope:\s*"gematik-core"/);
      await request.fulfill({ response, body: original.replace(/apiBaseUrl:\s*"[^"]*"/, 'apiBaseUrl: ""') });
      return;
    }
    await request.fulfill({
    contentType: "application/javascript",
    body: `window.VERSORGUNGS_COMPASS_CONFIG = {
      productScope: "gematik-core", dataMode: "api", authMode: "oidc",
      apiBaseUrl: "", requireApiGateway: true,
      capabilities: { organizationPrimarySystems: true, contactNotes: true }
    };`
    });
  });
  if (!artifactMode) await writeAppTestStorage(page);
  const appPrefix = String(process.env.GEMATIK_CORE_ARTIFACT_PREFIX ?? "/frontend/app").replace(/\/$/, "");
  await page.goto(`${appPrefix}/versorgungs-kompass.html#${route}`);
  expect(pageErrors, "Die Kernoberfläche startet ohne Skriptfehler").toEqual([]);
  await expect(page.locator(".app-shell")).not.toHaveClass(/is-initializing/);
  await expect.poll(() => requests.some((url) => url.includes("/api/hospitation-observations"))).toBe(true);
  return requests;
}

test("gematik-Kern zeigt nur Versorgung und Hospitation und lädt keine entfernten Fachdaten", async ({ page }) => {
  const requests = await openCore(page);
  await expect(page.locator(".home-destination-link:visible")).toHaveCount(2);
  await expect(page.locator(".home-destination-link:visible")).toHaveText(["Versorgungs-Kompass", "Hospitations-Kompass"]);
  for (const link of await page.locator(".home-destination-link:visible").all()) await expect(link).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-sidebar-group="stakeholders"]')).toBeHidden();
  await expect(page.locator('[data-sidebar-group="formats"]')).toBeHidden();
  expect(requests.filter((url) => removedApi.test(url))).toEqual([]);
  if (process.env.GEMATIK_PREVIEW_DIR) await page.screenshot({ path: `${process.env.GEMATIK_PREVIEW_DIR}/Gematik-Kern_${test.info().project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => window.VKAppRoutes.routes)).not.toHaveProperty("formats");
  expect(await page.evaluate(() => window.VKAppRoutes.routes)).not.toHaveProperty("politics");
});

test("entfernte Deep-Links und direkte Clientaufrufe öffnen keinen Fachpfad", async ({ page }) => {
  const requests = await openCore(page, "formats");
  await expect(page.locator('[data-view-panel="map"]')).toHaveClass(/is-active/);
  await expect(page).toHaveURL(/(?:#map|\/versorgung\/karte)$/);
  const outcome = await page.evaluate(async () => {
    const results = [];
    for (const request of [() => window.dataService.loadFormats(), () => window.dataService.loadBackendRegistrations()]) {
      try { await request(); results.push("unexpected-success"); }
      catch (error) { results.push(error.code); }
    }
    return {
      results,
      home: window.VKAppRoutes.urlForRouteToken("home"),
      removedPerson: window.VKAppRoutes.urlForRouteToken("person/expert/EX-1"),
      registrations: window.VKAppRoutes.urlForRouteToken("profile-imports:registrations")
    };
  });
  expect(outcome.results).toEqual(["PRODUCT_SCOPE_UNAVAILABLE", "PRODUCT_SCOPE_UNAVAILABLE"]);
  expect(outcome.removedPerson).toBe(outcome.home);
  expect(outcome.registrations).toBe(outcome.home);
  expect(requests.filter((url) => removedApi.test(url))).toEqual([]);
});

test("Hospitations-Kompass arbeitet im OIDC-Kern ohne Demo-Auswertungsquelle", async ({ page }) => {
  const requests = await openCore(page, "hospitation-overview");
  await expect(page.locator('[data-view-panel="hospitationOverview"]')).toHaveClass(/is-active/);
  await expect(page.locator("body")).toHaveClass(/hospitation-workspace-ready/);
  expect(await page.evaluate(() => window.VERSORGUNGS_COMPASS_DEMO_DATA)).toBeUndefined();
  if (process.env.GEMATIK_PREVIEW_DIR && test.info().project.name === "chromium-desktop") await page.screenshot({ path: `${process.env.GEMATIK_PREVIEW_DIR}/Hospitations-Kompass_Desktop.png`, fullPage: true });
  expect(await page.evaluate(() => {
    const route = window.VKAppRoutes.pathForRouteToken("hospitations:synthesis?stage=observations");
    return {
      path: route.path,
      query: route.query,
      parsed: window.VKAppRoutes.routeTokenForPath(new URL("hospitationen", window.VKAppRoutes.appBaseUrl).pathname, "?stage=observations")
    };
  })).toEqual({ path: "hospitationen", query: "stage=observations", parsed: "hospitations:synthesis?stage=observations" });
  await page.evaluate(() => {
    const route = window.VKAppRoutes.urlForRouteToken("hospitations:observations");
    if (window.VKAppRoutes.cleanUrlsEnabled()) {
      window.history.pushState({}, "", route);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else window.location.hash = "hospitations:observations";
  });
  await expect(page.locator('[data-view-panel="hospitations"]')).toHaveClass(/is-active/);
  expect(requests.filter((url) => removedApi.test(url))).toEqual([]);
});
