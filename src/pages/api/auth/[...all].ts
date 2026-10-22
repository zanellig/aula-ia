import { CONVEX_SITE_URL } from "astro:env/server";
import type { APIRoute } from "astro";

export const prerender = false;

// Forwards Better Auth requests to the Convex deployment, so the session
// cookie lives on this origin. Port of the handler in
// @convex-dev/better-auth/react-start, which imports React.
export const ALL: APIRoute = async ({ request, clientAddress }) => {
	const url = new URL(request.url);
	const proto = url.protocol.slice(0, -1);
	const headers = new Headers(request.headers);
	// Hop-by-hop headers of the incoming request; undici rejects them outbound.
	headers.delete("transfer-encoding");
	headers.delete("content-length");
	headers.delete("connection");
	// fetch() decompresses the body but keeps content-encoding, which would
	// garble the response we pass back. Ask Convex for an uncompressed one.
	headers.set("accept-encoding", "identity");
	headers.set("host", new URL(CONVEX_SITE_URL).host);
	headers.set("x-forwarded-host", url.host);
	headers.set("x-forwarded-proto", proto);
	headers.set("x-better-auth-forwarded-host", url.host);
	headers.set("x-better-auth-forwarded-proto", proto);
	// Convex's edge overwrites x-forwarded-for with this server's IP. Pass the
	// browser's (from Vercel's x-forwarded-for) so Better Auth rate-limits per
	// user instead of globally. See convex/auth.ts.
	headers.set("x-client-ip", clientAddress);

	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	return fetch(`${CONVEX_SITE_URL}${url.pathname}${url.search}`, {
		method: request.method,
		headers,
		redirect: "manual",
		// Auth bodies are small JSON; reading them avoids streaming-body (duplex) issues.
		body: hasBody ? await request.text() : undefined,
	});
};
