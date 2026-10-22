import { CircleAlert, LoaderCircle } from "lucide-preact";
import { useId, useState } from "preact/hooks";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from "../../convex/lib/constants";
import { getConvex } from "../lib/convex";
import { errorMessage } from "../lib/errors";
import { formatDayLong, formatTime } from "../lib/format";
import { useUser } from "../lib/session";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	buttonClass,
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Label,
	Textarea,
} from "./ui";

type Props = {
	open: boolean;
	onClose: () => void;
	teacher: { name: string; slug: string };
	slot: { _id: Id<"slots">; startsAt: number; durationMin: number };
	/** Live availability, so the dialog reacts if someone else takes the slot. */
	available: boolean;
};

export function BookingDialog({ open, onClose, ...props }: Props) {
	const user = useUser();
	const ids = useId();
	const step = { ...props, onClose, ids };

	return (
		<Dialog
			open={open}
			onClose={onClose}
			wide
			labelledBy={`${ids}-title`}
			describedBy={`${ids}-description`}
		>
			{user === undefined ? (
				<DialogHeader>
					<DialogTitle id={`${ids}-title`}>Reservar clase</DialogTitle>
					<DialogDescription
						id={`${ids}-description`}
						class="flex items-center gap-2"
					>
						<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
						Cargando…
					</DialogDescription>
				</DialogHeader>
			) : user ? (
				<BookingForm {...step} />
			) : (
				<SignInStep {...step} />
			)}
		</Dialog>
	);
}

type StepProps = Omit<Props, "open"> & { ids: string };

function SignInStep({ teacher, slot, onClose, ids }: StepProps) {
	const redirect = encodeURIComponent(`/profesores/${teacher.slug}`);
	return (
		<>
			<DialogHeader>
				<DialogTitle id={`${ids}-title`}>
					Iniciá sesión para reservar
				</DialogTitle>
				<DialogDescription id={`${ids}-description`}>
					Para reservar la clase con {teacher.name} del{" "}
					{formatDayLong(slot.startsAt)} a las {formatTime(slot.startsAt)}{" "}
					necesitás entrar con tu cuenta. Después volvés a esta página.
				</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button variant="outline" onClick={onClose}>
					Volver
				</Button>
				<a href={`/login?redirect=${redirect}`} class={buttonClass()}>
					Iniciar sesión
				</a>
			</DialogFooter>
		</>
	);
}

function validateTopic(topic: string) {
	const length = topic.trim().length;
	if (length === 0) return "Contanos qué querés trabajar en la clase.";
	if (length < TOPIC_MIN_LENGTH)
		return `Escribí al menos ${TOPIC_MIN_LENGTH} caracteres.`;
	if (length > TOPIC_MAX_LENGTH)
		return `Usá como máximo ${TOPIC_MAX_LENGTH} caracteres.`;
	return null;
}

function BookingForm({ teacher, slot, available, onClose, ids }: StepProps) {
	const [topic, setTopic] = useState("");
	const [submitted, setSubmitted] = useState(false);
	// "done" stays busy while the confirmation page loads.
	const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
	const [error, setError] = useState<unknown>(null);

	const topicError = submitted ? validateTopic(topic) : null;
	// Our own booking also flips `available`; don't flash a warning while it lands.
	const busy = status !== "idle";
	const slotGone = !available && !busy;

	async function handleSubmit(event: Event) {
		event.preventDefault();
		setSubmitted(true);
		if (validateTopic(topic) || slotGone || busy) return;
		setStatus("pending");
		setError(null);
		try {
			const convex = await getConvex();
			const bookingId = await convex.mutation(api.bookings.create, {
				slotId: slot._id,
				topic: topic.trim(),
			});
			setStatus("done");
			window.location.assign(`/reservas/${bookingId}`);
		} catch (err) {
			setError(err);
			setStatus("idle");
		}
	}

	return (
		<form onSubmit={handleSubmit} noValidate class="grid gap-4">
			<DialogHeader>
				<DialogTitle id={`${ids}-title`}>Reservá tu clase</DialogTitle>
				<DialogDescription id={`${ids}-description`}>
					Revisá los datos y contale a {teacher.name} qué querés trabajar.
				</DialogDescription>
			</DialogHeader>

			<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-lg bg-muted/60 px-4 py-3">
				<dt class="text-muted-foreground">Docente</dt>
				<dd class="font-medium">{teacher.name}</dd>
				<dt class="text-muted-foreground">Día</dt>
				<dd class="font-medium first-letter:uppercase">
					{formatDayLong(slot.startsAt)}
				</dd>
				<dt class="text-muted-foreground">Hora</dt>
				<dd class="font-medium">
					{formatTime(slot.startsAt)}{" "}
					<span class="font-normal text-muted-foreground">
						(hora de Argentina)
					</span>
				</dd>
				<dt class="text-muted-foreground">Duración</dt>
				<dd class="font-medium">{slot.durationMin} minutos</dd>
			</dl>

			<div class="grid gap-2">
				<Label for={`${ids}-topic`}>¿Qué querés trabajar en la clase?</Label>
				<Textarea
					id={`${ids}-topic`}
					value={topic}
					onInput={(event) => setTopic(event.currentTarget.value)}
					placeholder="Por ejemplo: quiero armar un buscador con RAG sobre los PDFs de mi equipo."
					required
					minLength={TOPIC_MIN_LENGTH}
					maxLength={TOPIC_MAX_LENGTH}
					rows={4}
					disabled={busy}
					aria-invalid={topicError ? true : undefined}
					aria-describedby={`${ids}-hint`}
				/>
				<div
					id={`${ids}-hint`}
					class="flex justify-between gap-4 text-xs text-muted-foreground"
				>
					<span class="text-destructive" aria-live="polite">
						{topicError}
					</span>
					<span class="shrink-0 tabular-nums">
						{topic.length}/{TOPIC_MAX_LENGTH}
					</span>
				</div>
			</div>

			{slotGone ? (
				<Alert variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>Este horario ya no está disponible</AlertTitle>
					<AlertDescription>
						Alguien lo reservó recién. Cerrá este diálogo y elegí otro horario.
					</AlertDescription>
				</Alert>
			) : (
				error !== null && (
					<Alert variant="destructive">
						<CircleAlert aria-hidden="true" />
						<AlertTitle>No pudimos confirmar la reserva</AlertTitle>
						<AlertDescription>{errorMessage(error)}</AlertDescription>
					</Alert>
				)
			)}

			<DialogFooter>
				<Button variant="outline" disabled={busy} onClick={onClose}>
					Volver
				</Button>
				<Button type="submit" disabled={busy || slotGone}>
					{busy && (
						<LoaderCircle
							data-icon="inline-start"
							class="animate-spin"
							aria-hidden="true"
						/>
					)}
					{busy ? "Reservando…" : "Confirmar reserva"}
				</Button>
			</DialogFooter>
		</form>
	);
}
