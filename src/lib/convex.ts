import { CONVEX_URL } from "astro:env/client";
import type { ConvexClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useEffect, useState } from "preact/hooks";
import { loadSession } from "./session";

let client: Promise<ConvexClient> | undefined;

// The Convex JWT for the session cookie, through our auth proxy.
async function fetchToken() {
	const response = await fetch("/api/auth/convex/token");
	if (!response.ok) return null;
	const { token }: { token: string } = await response.json();
	return token;
}

// One websocket per page, loaded after the island renders so the Convex
// client (~19 KB gzip) never delays the first paint. A signed-in visitor's
// queries wait for the token, so they never run as anonymous first.
export function getConvex() {
	client ??= Promise.all([import("convex/browser"), loadSession()]).then(
		([{ ConvexClient }, user]) => {
			const convex = new ConvexClient(CONVEX_URL, { expectAuth: !!user });
			if (user) convex.setAuth(fetchToken);
			return convex;
		},
	);
	return client;
}

/** Stops sending the ended session's token; queries re-run as anonymous. */
export function clearConvexAuth() {
	void client?.then((convex) => convex.client.clearAuth());
}

type QueryState<T> = { value?: T; error?: Error };

/**
 * A live query. `initial` (from the server render) shows until the first
 * update arrives. "skip" doesn't subscribe.
 */
export function useQuery<Q extends FunctionReference<"query">>(
	query: Q,
	args: FunctionArgs<Q> | "skip",
	initial?: FunctionReturnType<Q>,
): QueryState<FunctionReturnType<Q>> {
	const [state, setState] = useState<QueryState<FunctionReturnType<Q>>>({
		value: initial,
	});
	const key = JSON.stringify(args);
	// `key` stands for `args`; `query` is a stable reference.
	useEffect(() => {
		if (args === "skip") return;
		let stop: (() => void) | undefined;
		let cancelled = false;
		void getConvex().then((convex) => {
			if (cancelled) return;
			stop = convex.onUpdate(
				query,
				args,
				(value) => setState({ value }),
				(error) => setState({ error }),
			);
		});
		return () => {
			cancelled = true;
			stop?.();
		};
	}, [key]);
	return state;
}
