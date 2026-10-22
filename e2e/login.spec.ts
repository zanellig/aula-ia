import { expect, test } from "@playwright/test";

test("the login mode lives in the URL: header link, back/forward, redirect", async ({
	page,
}) => {
	const title = page.locator('[data-slot="card-title"]');
	await page.goto("/login?redirect=/mis-clases", { waitUntil: "networkidle" });
	await expect(title).toHaveText("Ingresar");

	await page
		.getByRole("button", { name: "¿No tenés cuenta? Registrate" })
		.click();
	await expect(title).toHaveText("Crear cuenta");
	const url = new URL(page.url());
	expect(url.searchParams.get("mode")).toBe("sign-up");
	expect(url.searchParams.get("redirect")).toBe("/mis-clases");

	await page.goBack();
	await expect(title).toHaveText("Ingresar");
	await page.goForward();
	await expect(title).toHaveText("Crear cuenta");

	await page
		.getByRole("banner")
		.getByRole("link", { name: "Ingresar" })
		.click();
	await expect(title).toHaveText("Ingresar");
	await expect(page).toHaveURL(/\/login$/);
});
