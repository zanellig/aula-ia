import { CONVEX_URL } from "astro:env/client";
import type { ConvexClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useEffect, useState } from "preact/hooks";

let client: Promise<ConvexClient> | undefined;

// One websocket per page, loaded after the island renders so the Convex
// client (~19 KB gzip) never delays the first paint.
export function getConvex() {
	client ??= import("convex/browser").then(
		({ ConvexClient }) => new ConvexClient(CONVEX_URL),
	);
	return client;
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
