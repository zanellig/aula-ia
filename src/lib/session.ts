import { useEffect, useState } from "preact/hooks";

export type User = { name: string; email: string };

// Pages are cached for everyone, so the signed-in user is only known in the
// browser. All islands on a page share this one store.
// undefined: not known yet. null: signed out.
let user: User | null | undefined;
const listeners = new Set<() => void>();

function setUser(next: User | null) {
	user = next;
	for (const listener of listeners) listener();
}

export function useUser() {
	const [current, setCurrent] = useState(user);
	useEffect(() => {
		const update = () => setCurrent(user);
		listeners.add(update);
		update(); // in case the session loaded between render and this effect
		return () => {
			listeners.delete(update);
		};
	}, []);
	return current;
}

// A non-secret hint, readable by JS (the session cookie is httpOnly): with no
// hint, the visitor is signed out without asking the server. A stale hint is
// corrected by get-session. The inline script in Layout.astro reads it too.
const HINT = "aula_signed_in";
const secure = () => (location.protocol === "https:" ? "; secure" : "");
// ponytail: document.cookie, because the Cookie Store API is missing in older Safari.
export function setSignedInHint() {
	// biome-ignore lint/suspicious/noDocumentCookie: see above.
	document.cookie = `${HINT}=1; path=/; max-age=2592000; samesite=lax${secure()}`;
}
function clearSignedInHint() {
	// biome-ignore lint/suspicious/noDocumentCookie: see setSignedInHint.
	document.cookie = `${HINT}=; path=/; max-age=0; samesite=lax${secure()}`;
}
const hasSignedInHint = () => document.cookie.split("; ").includes(`${HINT}=1`);

/** Asks Better Auth for the current user. Throws if it can't tell. */
export async function fetchUser(): Promise<User | null> {
	const response = await fetch("/api/auth/get-session");
	if (!response.ok) throw new Error(`get-session: ${response.status}`);
	const session: { user: User } | null = await response.json();
	return session?.user ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let loading: Promise<User | null> | undefined;

/** The user for this page load, asked once. Retries while offline. */
export function loadSession() {
	loading ??= (async () => {
		if (!hasSignedInHint()) return null;
		for (;;) {
			try {
				return await fetchUser();
			} catch {
				await sleep(3_000);
			}
		}
	})().then((next) => {
		if (!next) clearSignedInHint();
		setUser(next);
		return next;
	});
	return loading;
}

/** The session ended mid-visit (expired, or revoked from another device). */
export function endSession() {
	clearSignedInHint();
	setUser(null);
}

let signingOut = false;
// True while "Salir" runs, so ending the session on purpose isn't reported as expired.
export const isSigningOut = () => signingOut;

export async function signOut() {
	signingOut = true;
	try {
		const response = await fetch("/api/auth/sign-out", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{}",
		});
		if (!response.ok) throw new Error(`sign-out: ${response.status}`);
	} catch (error) {
		// The response can be lost after the server already ended the session.
		// Only a session that is still there (or can't be checked) means it failed,
		// and then a later revocation must still be reported.
		const stillSignedIn = await fetchUser().then(Boolean, () => true);
		if (stillSignedIn) {
			signingOut = false;
			throw error;
		}
	}
	clearSignedInHint();
	window.location.assign("/");
}
