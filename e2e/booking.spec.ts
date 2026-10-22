import { expect, type Page, test } from "@playwright/test";

const PROFILE = "/profesores/martin-ocampo";
const TOPIC = "Quiero armar un buscador con RAG.";

// The row of one day in the profile's slot list.
const dayRow = (page: Page, day: string) =>
	page
		.locator("ol > li")
		.filter({ has: page.getByRole("heading", { name: day, exact: true }) });

// One sign-up in total: sign-in/sign-up allow 3 per 10 s per IP.
test("a booking from the sign-in prompt to its cancellation, seen live by another visitor", async ({
	browser,
}) => {
	// A visitor who isn't signed in is asked to sign in first.
	const viewer = await (await browser.newContext()).newPage();
	await viewer.goto(PROFILE, { waitUntil: "networkidle" });
	const slot = viewer.getByRole("button", { name: /^Reservar / }).first();
	const label = (await slot.getAttribute("aria-label")) ?? "";
	const [day, time] = label.replace("Reservar ", "").split(" a las ");
	await slot.click();
	const prompt = viewer.getByRole("dialog");
	await expect(
		prompt.getByRole("heading", { name: "Iniciá sesión para reservar" }),
	).toBeVisible();
	await expect(
		prompt.getByRole("link", { name: "Iniciar sesión" }),
	).toHaveAttribute("href", `/login?redirect=${encodeURIComponent(PROFILE)}`);
	await prompt.getByRole("button", { name: "Volver" }).click();
	await expect(prompt).toBeHidden();

	// Sign up and come back to the profile.
	const student = await (await browser.newContext()).newPage();
	await student.goto(`/login?redirect=${PROFILE}&mode=sign-up`, {
		waitUntil: "networkidle",
	});
	await student.getByLabel("Nombre").fill("E2E");
	await student.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
	await student.getByLabel("Contraseña").fill("password123");
	await student
		.getByRole("button", { name: "Crear cuenta", exact: true })
		.click();
	await expect(student).toHaveURL(PROFILE);
	await student.waitForLoadState("networkidle"); // hydrated, so clicks work

	// The topic is required.
	await student.getByRole("button", { name: label }).click();
	const form = student.getByRole("dialog");
	await expect(
		form.getByRole("heading", { name: "Reservá tu clase" }),
	).toBeVisible();
	await form.getByRole("button", { name: "Confirmar reserva" }).click();
	await expect(
		form.getByText("Contanos qué querés trabajar en la clase."),
	).toBeVisible();
	await form.getByLabel("¿Qué querés trabajar en la clase?").fill(TOPIC);
	await form.getByRole("button", { name: "Confirmar reserva" }).click();

	await expect(student).toHaveURL(/\/reservas\/\w+$/);
	await expect(student.getByText("Reserva confirmada")).toBeVisible();
	await expect(student.getByText(TOPIC)).toBeVisible();

	// The other visitor sees the slot taken, without reloading.
	await expect(
		dayRow(viewer, day).getByRole("button", { name: `${time}, reservado` }),
	).toBeDisabled();

	// Mis clases lists it, and cancelling frees the slot again.
	await student.getByRole("link", { name: "Ver mis clases" }).click();
	const booking = student.getByRole("article").filter({ hasText: TOPIC });
	await expect(booking.getByText("Confirmada", { exact: true })).toBeVisible();
	await student.waitForLoadState("networkidle");
	await booking
		.getByRole("button", { name: /^Cancelar la clase del / })
		.click();
	await student
		.getByRole("dialog")
		.getByRole("button", { name: "Cancelar clase" })
		.click();
	await expect(student.getByText("Clase cancelada")).toBeVisible();
	await expect(booking.getByText("Cancelada", { exact: true })).toBeVisible();
	await expect(
		dayRow(viewer, day).getByRole("button", { name: label }),
	).toBeEnabled();
});
