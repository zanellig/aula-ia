// @ts-check
import preact from "@astrojs/preact";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// Pages are static by default. Public pages opt into on-demand rendering
// with `export const prerender = false` and a CDN Cache-Control header.
export default defineConfig({
	adapter: vercel(),
	integrations: [preact()],
	vite: { plugins: [tailwindcss()] },
	env: {
		schema: {
			// Names written to .env.local by `convex dev`.
			CONVEX_URL: envField.string({ context: "client", access: "public" }),
			CONVEX_SITE_URL: envField.string({
				context: "server",
				access: "public",
			}),
		},
	},
});
