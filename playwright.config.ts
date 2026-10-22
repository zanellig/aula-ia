import { defineConfig } from "@playwright/test";

// End-to-end tests against `astro dev` and the Convex deployment in .env.local.
export default defineConfig({
	testDir: "e2e",
	use: { baseURL: "http://localhost:4321" },
	webServer: {
		// --ignore-lock keeps it in the foreground, also when an AI agent runs it.
		command: "bunx astro dev --ignore-lock",
		url: "http://localhost:4321",
		reuseExistingServer: true,
	},
});
