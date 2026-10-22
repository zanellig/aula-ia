import { CircleCheck, Info, LogIn, LogOut, OctagonX, X } from "lucide-preact";
import { useEffect, useRef } from "preact/hooks";
import { api } from "../../convex/_generated/api";
import { clearConvexAuth, useQuery } from "../lib/convex";
import {
	endSession,
	fetchUser,
	isSigningOut,
	loadSession,
	signOut,
	useUser,
} from "../lib/session";
import { dismiss, type Toast, toast, useToasts } from "../lib/toast";
import { Button, buttonClass, Skeleton } from "./ui";

/** The header's account area, plus what every page needs once: toasts and the session watcher. */
export function HeaderAuth() {
	const user = useUser();
	useEffect(() => {
		void loadSession();
	}, []);

	return (
		<>
			<div class="ml-auto flex items-center gap-3">
				{user === undefined ? (
					// Server render: the inline script in Layout.astro shows the
					// link for visitors without the signed-in hint, the skeleton otherwise.
					<>
						<SignInLink class="in-data-[auth=in]:hidden" />
						<Skeleton class="hidden h-4 w-24 in-data-[auth=in]:sm:block" />
					</>
				) : user ? (
					<>
						<span class="hidden text-sm text-muted-foreground sm:inline">
							{user.name}
						</span>
						<Button
							variant="ghost"
							size="sm"
							aria-label="Salir"
							onClick={() =>
								signOut().catch(() =>
									toast.error("No pudimos cerrar la sesión. Probá de nuevo."),
								)
							}
						>
							<LogOut />
							<span class="hidden sm:inline">Salir</span>
						</Button>
					</>
				) : (
					<SignInLink />
				)}
			</div>
			{user && <SessionWatcher />}
			<Toaster />
		</>
	);
}

const SignInLink = ({ class: className }: { class?: string }) => (
	<a
		href="/login"
		aria-label="Ingresar"
		class={buttonClass({ size: "sm" }, className)}
	>
		<LogIn />
		<span class="hidden sm:inline">Ingresar</span>
	</a>
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The session can end mid-visit: it expires, or it's revoked from another
// device. getCurrentUser is reactive and turns null as soon as either happens
// (an expired JWT that can't be refreshed leaves Convex unauthenticated too).
function SessionWatcher() {
	const { value: current } = useQuery(api.auth.getCurrentUser, {});
	const hadUser = useRef(false);

	useEffect(() => {
		if (current) hadUser.current = true;
		if (current !== null || !hadUser.current) return;
		// getCurrentUser can also read null for a moment while the token
		// refreshes. Better Auth has the final word on the session.
		let superseded = false;
		void (async () => {
			for (;;) {
				const session = await fetchUser().then(
					(user) => ({ user, failed: false }),
					() => ({ user: null, failed: true }),
				);
				if (superseded || session.user || isSigningOut()) return;
				// Couldn't ask (offline, server error): the query stays null and
				// won't re-run this effect, so ask again.
				if (!session.failed) break;
				await sleep(3_000);
			}
			hadUser.current = false;
			clearConvexAuth();
			endSession();
			toast.info("Tu sesión terminó. Ingresá de nuevo para seguir.", {
				duration: 10_000,
				action: {
					label: "Ingresar",
					onClick: () =>
						window.location.assign(
							`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`,
						),
				},
			});
		})();
		return () => {
			superseded = true;
		};
	}, [current]);

	return null;
}

const icons = { success: CircleCheck, error: OctagonX, info: Info };

function Toaster() {
	const toasts = useToasts();
	return (
		<section
			aria-label="Notificaciones"
			aria-live="polite"
			class="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
		>
			{toasts.map((t) => (
				<ToastItem key={t.id} toast={t} />
			))}
		</section>
	);
}

function ToastItem({ toast: t }: { toast: Toast }) {
	const Icon = icons[t.kind];
	return (
		<div class="flex items-center gap-2 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-lg transition duration-200 starting:translate-y-2 starting:opacity-0">
			<Icon class="size-4 shrink-0" aria-hidden="true" />
			<p class="flex-1">{t.message}</p>
			{t.action && (
				<Button
					size="sm"
					onClick={() => {
						dismiss(t.id);
						t.action?.onClick();
					}}
				>
					{t.action.label}
				</Button>
			)}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Cerrar"
				onClick={() => dismiss(t.id)}
			>
				<X />
			</Button>
		</div>
	);
}
