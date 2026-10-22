import { CircleAlert, LoaderCircle } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { safePath } from "../lib/safe-path";
import { loadSession, setSignedInHint } from "../lib/session";
import { Alert, AlertDescription, Button, Input, Label } from "./ui";

const errorMessages: Record<string, string> = {
	INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos.",
	USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email.",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email.",
};

// The mode lives in the URL, so a plain link to /login (the header's
// "Ingresar") resets it, and back/forward switch it.
const isSignUpUrl = () =>
	new URLSearchParams(location.search).get("mode") === "sign-up";
const redirectTarget = () =>
	safePath(new URLSearchParams(location.search).get("redirect")) ?? "/";

export function LoginForm() {
	// The page is static: it renders as "Ingresar" and reads the URL on hydration.
	const [isSignUp, setIsSignUp] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		const sync = () => {
			setIsSignUp(isSignUpUrl());
			setError(null);
		};
		sync();
		window.addEventListener("popstate", sync);
		// Already signed in: go where the sign-in would have taken you.
		void loadSession().then((user) => {
			if (user) window.location.replace(redirectTarget());
		});
		return () => window.removeEventListener("popstate", sync);
	}, []);

	function toggleMode() {
		const url = new URL(location.href);
		if (isSignUp) url.searchParams.delete("mode");
		else url.searchParams.set("mode", "sign-up");
		history.pushState(null, "", url);
		setIsSignUp(!isSignUp);
		setError(null);
	}

	async function onSubmit(event: Event) {
		event.preventDefault();
		const form = new FormData(event.currentTarget as HTMLFormElement);
		const body = isSignUp
			? {
					name: form.get("name"),
					email: form.get("email"),
					password: form.get("password"),
				}
			: { email: form.get("email"), password: form.get("password") };
		setPending(true);
		setError(null);
		const response = await fetch(
			`/api/auth/${isSignUp ? "sign-up" : "sign-in"}/email`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			},
		).catch(() => null);
		if (!response?.ok) {
			// No response (offline) or a body that isn't JSON: the generic message.
			const { code }: { code?: string } = response
				? await response.json().catch(() => ({}))
				: {};
			setError(
				errorMessages[code ?? ""] ??
					"No pudimos completar la operación. Probá de nuevo.",
			);
			setPending(false);
			return;
		}
		setSignedInHint();
		// A full load, so every island and the Convex client start with the session.
		window.location.assign(redirectTarget());
	}

	return (
		<div class="mx-auto my-auto w-full max-w-sm sm:my-0">
			<div class="flex flex-col gap-4 overflow-hidden rounded-xl bg-card pt-4 text-sm text-card-foreground ring-1 ring-foreground/10">
				<div class="grid gap-1 px-4">
					<h1 data-slot="card-title" class="text-base leading-snug font-medium">
						{isSignUp ? "Crear cuenta" : "Ingresar"}
					</h1>
					<p class="text-sm text-muted-foreground">
						{isSignUp
							? "Registrate y reservá tu primera clase."
							: "Ingresá para reservar y ver tus clases."}
					</p>
				</div>
				<form onSubmit={onSubmit}>
					<div class="flex flex-col gap-4 px-4">
						{error && (
							<Alert variant="destructive">
								<CircleAlert aria-hidden="true" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						{isSignUp && (
							<div class="flex flex-col gap-2">
								<Label for="name">Nombre</Label>
								<Input id="name" name="name" autoComplete="name" required />
							</div>
						)}
						<div class="flex flex-col gap-2">
							<Label for="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="password">Contraseña</Label>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete={isSignUp ? "new-password" : "current-password"}
								minLength={8}
								required
							/>
						</div>
					</div>
					<div class="mt-6 flex flex-col gap-2 rounded-b-xl border-t bg-muted/50 p-4">
						<Button type="submit" class="w-full" disabled={pending}>
							{pending && <LoaderCircle class="animate-spin" />}
							{isSignUp ? "Crear cuenta" : "Ingresar"}
						</Button>
						<Button variant="link" size="sm" onClick={toggleMode}>
							{isSignUp
								? "¿Ya tenés cuenta? Ingresá"
								: "¿No tenés cuenta? Registrate"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
