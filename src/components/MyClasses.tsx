import type { FunctionReturnType } from "convex/server";
import { useId, useRef, useState } from "preact/hooks";
import { api } from "../../convex/_generated/api";
import { getConvex, useQuery } from "../lib/convex";
import { errorMessage } from "../lib/errors";
import { formatDayLong, formatTime } from "../lib/format";
import { useUser } from "../lib/session";
import { toast } from "../lib/toast";
import { SignInPrompt } from "./SignInPrompt";
import { StatusBadge } from "./StatusBadge";
import { TeacherAvatar } from "./TeacherAvatar";
import {
	Button,
	buttonClass,
	cx,
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Skeleton,
} from "./ui";

type Booking = FunctionReturnType<typeof api.bookings.listMine>[number];

export function MyClasses() {
	const user = useUser();
	const { value: bookings } = useQuery(
		api.bookings.listMine,
		user ? {} : "skip",
	);

	const prompt = (hide?: string) => (
		<div class={cx("my-auto sm:my-0 sm:py-6", hide)}>
			<SignInPrompt
				title="Iniciá sesión para ver tus clases"
				description="Acá vas a encontrar las clases que reservaste."
				redirect="/mis-clases"
			/>
		</div>
	);
	if (user === null) return prompt();
	// Not known yet: the signed-in hint (Layout.astro) picks which one shows.
	if (user === undefined) {
		return (
			<>
				{prompt("in-data-[auth=in]:hidden")}
				<BookingList class="in-data-[auth=out]:hidden" />
			</>
		);
	}
	return <BookingList bookings={bookings} />;
}

function BookingList({
	bookings,
	class: className,
}: {
	bookings?: Array<Booking>;
	class?: string;
}) {
	return (
		<div class={cx("max-w-3xl sm:py-6", className)}>
			<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
				Mis clases
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Acá podés ver tus próximas clases.
			</p>

			<div class="mt-8">
				{bookings === undefined ? (
					<div class="grid gap-3" aria-busy="true">
						<Skeleton class="h-28 rounded-xl" />
						<Skeleton class="h-28 rounded-xl" />
					</div>
				) : bookings.length === 0 ? (
					<section class="rounded-xl border border-dashed px-6 py-12 text-center">
						<h2 class="font-medium">Todavía no tenés clases reservadas</h2>
						<p class="mt-1 text-muted-foreground">
							Elegí un profesor y reservá tu primera clase.
						</p>
						<a href="/" class={buttonClass({}, "mt-6")}>
							Ver profesores
						</a>
					</section>
				) : (
					<ul class="grid gap-3">
						{bookings.map((booking) => (
							<li key={booking._id}>
								<BookingItem booking={booking} />
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function BookingItem({ booking }: { booking: Booking }) {
	const cancelled = booking.status === "cancelled";

	return (
		<article
			class={cx(
				"flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start",
				cancelled ? "bg-muted/40 text-muted-foreground" : "bg-card",
			)}
		>
			<span class={cx(cancelled && "opacity-60")}>
				<TeacherAvatar
					name={booking.teacher.name}
					photoUrl={booking.teacher.photoUrl}
				/>
			</span>
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h2
						class={cx(
							"font-medium first-letter:uppercase",
							cancelled && "line-through decoration-1",
						)}
					>
						{formatDayLong(booking.startsAt)}, {formatTime(booking.startsAt)}
					</h2>
					<StatusBadge status={booking.status} />
				</div>
				<p class="mt-0.5 text-sm">
					con{" "}
					<a
						href={`/profesores/${booking.teacher.slug}`}
						class="font-medium underline-offset-4 hover:underline"
					>
						{booking.teacher.name}
					</a>{" "}
					<span class="text-muted-foreground">({booking.durationMin} min)</span>
				</p>
				<p class="mt-3 line-clamp-3 text-sm wrap-break-word text-muted-foreground">
					{booking.topic}
				</p>
			</div>
			{!cancelled && <CancelBookingButton booking={booking} />}
		</article>
	);
}

function CancelBookingButton({ booking }: { booking: Booking }) {
	const ids = useId();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	// Blocks a second click that lands before Preact re-renders (e.g. a double click).
	const sending = useRef(false);
	const when = `${formatDayLong(booking.startsAt)} a las ${formatTime(booking.startsAt)}`;

	async function cancel() {
		setOpen(false);
		if (sending.current) return;
		sending.current = true;
		setPending(true);
		try {
			const convex = await getConvex();
			await convex.mutation(
				api.bookings.cancel,
				{ bookingId: booking._id },
				{
					// Convex applies this to its local store at once and drops it when the
					// server answers, so on error the card goes back to "Confirmada" by itself.
					optimisticUpdate: (store, { bookingId }) => {
						const list = store.getQuery(api.bookings.listMine, {});
						if (list) {
							store.setQuery(
								api.bookings.listMine,
								{},
								list.map((b) =>
									b._id === bookingId
										? { ...b, status: "cancelled" as const }
										: b,
								),
							);
						}
						const one = store.getQuery(api.bookings.get, { bookingId });
						if (one) {
							store.setQuery(
								api.bookings.get,
								{ bookingId },
								{ ...one, status: "cancelled" },
							);
						}
					},
				},
			);
			toast.success("Clase cancelada");
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			sending.current = false;
			setPending(false);
		}
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				class="self-start"
				disabled={pending}
				aria-haspopup="dialog"
				aria-label={`Cancelar la clase del ${when}`}
				onClick={() => setOpen(true)}
			>
				Cancelar
			</Button>
			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				labelledBy={`${ids}-title`}
				describedBy={`${ids}-description`}
			>
				<DialogHeader>
					<DialogTitle id={`${ids}-title`}>¿Cancelar la clase?</DialogTitle>
					<DialogDescription id={`${ids}-description`}>
						Vas a cancelar la clase con {booking.teacher.name} del {when}.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Volver
					</Button>
					<Button variant="destructive" onClick={cancel}>
						Cancelar clase
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	);
}
