import { defineConfig } from "@playwright/test";

// End-to-end tests against `astro dev` and the Convex deployment in .env.local,
// or against a deployment: E2E_BASE_URL=https://aula-ia-clases.vercel.app.
const deployed = process.env.E2E_BASE_URL;

export default defineConfig({
	testDir: "e2e",
	use: { baseURL: deployed ?? "http://localhost:4321" },
	webServer: deployed
		? undefined
		: {
				// --ignore-lock keeps it in the foreground, also when an AI agent runs it.
				command: "bunx astro dev --ignore-lock",
				url: "http://localhost:4321",
				reuseExistingServer: true,
			},
});
