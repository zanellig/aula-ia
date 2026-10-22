import { CONVEX_URL } from "astro:env/client";
import { ConvexHttpClient } from "convex/browser";

// Public pages are the same for everyone, so the CDN keeps them for a minute
// and keeps serving the old copy while it renders a new one in the background.
// Set it only after the data loaded, so an error page isn't cached.
export const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=86400";

// Server renders never send a session token: they must be the same for every
// visitor (see AGENTS.md).
export const convexHttp = () => new ConvexHttpClient(CONVEX_URL);
