// Fixed placeholder: validateSearch also runs during SSR, where there is no window.
const ORIGIN = "https://app.invalid";

function sameOriginPath(value: string) {
	try {
		const url = new URL(value, ORIGIN);
		return url.origin === ORIGIN
			? url.pathname + url.search + url.hash
			: undefined;
	} catch {
		return undefined;
	}
}

// A redirect target that stays on this site, as the browser will resolve it
// (WHATWG parsing strips tabs/newlines, so "/\t/evil.com" means "//evil.com").
// The normalized path is checked again: "/.//evil.com" normalizes to "//evil.com".
export function safePath(value: unknown) {
	if (typeof value !== "string") return undefined;
	const path = sameOriginPath(value);
	return path !== undefined && sameOriginPath(path) === path ? path : undefined;
}
