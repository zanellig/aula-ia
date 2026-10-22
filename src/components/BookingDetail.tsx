import type { FunctionReturnType } from "convex/server";
import { Check, X } from "lucide-preact";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "../lib/convex";
import { formatDayLong, formatTime } from "../lib/format";
import { useUser } from "../lib/session";
import { SignInPrompt } from "./SignInPrompt";
import { TeacherAvatar } from "./TeacherAvatar";
import { buttonClass, cx, Skeleton } from "./ui";

type BookingView = NonNullable<FunctionReturnType<typeof api.bookings.get>>;

/** The booking confirmation, live: a cancellation elsewhere shows here too. */
export function BookingDetail({ bookingId }: { bookingId: string }) {
	const user = useUser();
	const { value: booking, error } = useQuery(
		api.bookings.get,
		user ? { bookingId: bookingId as Id<"bookings"> } : "skip",
	);
	const prompt = (hide?: string) => (
		<div class={cx("my-auto sm:my-0 sm:py-6", hide)}>
			<SignInPrompt
				title="Iniciá sesión para ver tu reserva"
				description="Las reservas solo las puede ver quien las hizo."
				redirect={`/reservas/${bookingId}`}
			/>
		</div>
	);
	const loading = (hide?: string) => (
		<div class={cx("mx-auto w-full max-w-xl sm:py-6", hide)} aria-busy="true">
			<Skeleton class="mx-auto h-7 w-44 rounded-full" />
			<Skeleton class="mx-auto mt-4 h-9 w-80 max-w-full" />
			<Skeleton class="mt-8 h-40 rounded-xl" />
		</div>
	);

	if (user === null) return prompt();
	// Not known yet: the signed-in hint (Layout.astro) picks which one shows.
	if (user === undefined) {
		return (
			<>
				{prompt("in-data-[auth=in]:hidden")}
				{loading("in-data-[auth=out]:hidden")}
			</>
		);
	}
	// A malformed id fails the v.id("bookings") validator: same as missing.
	if (error?.message.includes("ArgumentValidationError") || booking === null)
		return <BookingNotFound />;
	if (error) return <LoadError />;
	if (booking === undefined) return loading();
	return <BookingDetails booking={booking} />;
}

function BookingDetails({ booking }: { booking: BookingView }) {
	const confirmed = booking.status === "confirmed";
	const StatusIcon = confirmed ? Check : X;

	return (
		<article class="mx-auto max-w-xl sm:py-6">
			<div class="flex flex-col items-center text-center">
				<p
					class={cx(
						"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
						confirmed
							? "bg-emerald-50 text-emerald-700"
							: "bg-muted text-muted-foreground",
					)}
				>
					<StatusIcon class="size-4" aria-hidden="true" />
					{confirmed ? "Reserva confirmada" : "Reserva cancelada"}
				</p>
				<h1
					class={cx(
						"mt-4 text-2xl font-semibold tracking-tight text-balance first-letter:uppercase sm:text-3xl",
						!confirmed && "text-muted-foreground line-through decoration-1",
					)}
				>
					{formatDayLong(booking.startsAt)}, {formatTime(booking.startsAt)}
				</h1>
				<p class="mt-2 text-muted-foreground">
					Hora de Argentina · {booking.durationMin} minutos
				</p>
			</div>

			<div class="mt-8 rounded-xl border">
				<div class="flex items-center gap-3 border-b p-4">
					<TeacherAvatar
						name={booking.teacher.name}
						photoUrl={booking.teacher.photoUrl}
					/>
					<div class="min-w-0">
						<a
							href={`/profesores/${booking.teacher.slug}`}
							class="font-medium underline-offset-4 hover:underline"
						>
							{booking.teacher.name}
						</a>
						<p class="text-sm text-muted-foreground">
							{booking.teacher.headline}
						</p>
					</div>
				</div>
				<dl class="p-4 text-sm">
					<dt class="text-muted-foreground">Tema</dt>
					<dd class="mt-1 wrap-break-word whitespace-pre-line">
						{booking.topic}
					</dd>
				</dl>
			</div>

			<div class="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
				<a href="/mis-clases" class={buttonClass({ size: "lg" })}>
					Ver mis clases
				</a>
				<a href="/" class={buttonClass({ variant: "outline", size: "lg" })}>
					Reservar otra clase
				</a>
			</div>
		</article>
	);
}

function BookingNotFound() {
	return (
		<section class="text-center sm:py-6">
			<h1 class="text-xl font-semibold tracking-tight">
				No encontramos esta reserva
			</h1>
			<p class="mt-2 text-muted-foreground">
				Puede que el enlace esté mal o que la reserva sea de otra cuenta.
			</p>
			<a href="/mis-clases" class={buttonClass({}, "mt-6")}>
				Ver mis clases
			</a>
		</section>
	);
}

// Same as the 500 page, for a query that failed after the page loaded.
function LoadError() {
	return (
		<div class="flex flex-col items-center gap-3 py-16 text-center">
			<h1 class="text-xl font-semibold">Algo salió mal</h1>
			<p class="text-sm text-muted-foreground">
				Ocurrió un error inesperado. Probá de nuevo.
			</p>
			<div class="flex gap-2">
				<a href={location.href} class={buttonClass()}>
					Reintentar
				</a>
				<a href="/" class={buttonClass({ variant: "outline" })}>
					Ir al inicio
				</a>
			</div>
		</div>
	);
}
