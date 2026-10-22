import { expect, type Page, test } from "@playwright/test";

const PASSWORD = "password123";
const ENDED = "Tu sesión terminó. Ingresá de nuevo para seguir.";

async function login(page: Page, email: string, signUp: boolean) {
	// networkidle: clicks before hydration do nothing.
	await page.goto("/login?redirect=/mis-clases", { waitUntil: "networkidle" });
	if (signUp) {
		await page
			.getByRole("button", { name: "¿No tenés cuenta? Registrate" })
			.click();
		await page.getByLabel("Nombre").fill("E2E");
	}
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Contraseña").fill(PASSWORD);
	await page
		.getByRole("button", {
			name: signUp ? "Crear cuenta" : "Ingresar",
			exact: true,
		})
		.click();
	await expect(page.getByRole("heading", { name: "Mis clases" })).toBeVisible();
	await page.waitForLoadState("networkidle"); // hydrated, so clicks work
}

// Records in sessionStorage (survives the reload after "Salir") if the notice ever shows.
async function watchForNotice(page: Page) {
	await page.evaluate((text) => {
		new MutationObserver(() => {
			if (document.body.innerText.includes(text))
				sessionStorage.setItem("saw-notice", "1");
		}).observe(document.body, { childList: true, subtree: true });
	}, ENDED);
}

// Two auth requests in total: sign-in/sign-up allow 3 per 10 s per IP.
test("a session revoked from another device signs the tab out with a notice", async ({
	browser,
}) => {
	const email = `e2e-${Date.now()}@example.com`;
	const tab = await (await browser.newContext()).newPage();
	await login(tab, email, true);
	const other = await (await browser.newContext()).newPage();
	await login(other, email, false);
	// Neither page load nor sign-in shows the notice.
	await expect(tab.getByText(ENDED)).toHaveCount(0);
	await expect(other.getByText(ENDED)).toHaveCount(0);

	// A sign-out that fails offline must not mute later notices.
	await tab.route("**/api/auth/sign-out", (r) => r.abort());
	const signOutFailed = tab.waitForEvent("requestfailed");
	await tab.getByRole("button", { name: "Salir" }).click();
	await signOutFailed;
	await tab.unroute("**/api/auth/sign-out");

	// The session check fails while offline, and is retried once back online.
	await tab.route("**/api/auth/get-session", (r) => r.abort());
	const checkFailed = tab.waitForEvent("requestfailed", (r) =>
		r.url().includes("/get-session"),
	);
	const res = await other.evaluate(() =>
		fetch("/api/auth/revoke-other-sessions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{}",
		}).then((r) => r.status),
	);
	expect(res).toBe(200);
	await checkFailed;
	await expect(tab.getByText(ENDED)).toHaveCount(0);
	await tab.unroute("**/api/auth/get-session");

	await expect(tab.getByText(ENDED)).toBeVisible({ timeout: 5_000 });
	await expect(tab.getByRole("link", { name: "Ingresar" })).toBeVisible();
	await expect(tab.getByRole("button", { name: "Salir" })).toHaveCount(0);
	await expect(
		tab.getByRole("heading", { name: "Iniciá sesión para ver tus clases" }),
	).toBeVisible();

	// Signing out on purpose is not reported as an ended session, even when the
	// server ends it but the response is lost. The slow reload keeps this page
	// alive meanwhile, as on a slow connection.
	await watchForNotice(other);
	await other.route("**/api/auth/sign-out", async (route) => {
		await route.fetch();
		await route.abort();
	});
	await other.route("/", async (route) => {
		await new Promise((r) => setTimeout(r, 2_000));
		await route.continue();
	});
	await other.getByRole("button", { name: "Salir" }).click();
	await expect(other.getByRole("link", { name: "Ingresar" })).toBeVisible();
	await other.waitForTimeout(1_000);
	expect(
		await other.evaluate(() => sessionStorage.getItem("saw-notice")),
	).toBeNull();
});
