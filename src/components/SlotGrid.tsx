import type { FunctionReturnType } from "convex/server";
import { useState } from "preact/hooks";
import { api } from "../../convex/_generated/api";
import { useQuery } from "../lib/convex";
import { formatDayLong, formatTime, groupByDay } from "../lib/format";
import { BookingDialog } from "./BookingDialog";
import { Button } from "./ui";

type Teacher = NonNullable<FunctionReturnType<typeof api.teachers.getBySlug>>;
type Slot = Teacher["slots"][number];

/**
 * The teacher's slots, live: a slot someone else books turns "Reservado"
 * while you look. Starts from the server render's data.
 */
export function SlotGrid({ initial }: { initial: Teacher }) {
	const { value } = useQuery(
		api.teachers.getBySlug,
		{ slug: initial.teacher.slug },
		initial,
	);
	// ponytail: a teacher deleted mid-visit keeps its last slots; teachers only
	// change through the seed.
	const { teacher, slots } = value ?? initial;
	const [selected, setSelected] = useState<Slot | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Read availability from live data so the dialog reacts if someone else books it.
	const selectedAvailable =
		selected !== null &&
		slots.some((slot) => slot._id === selected._id && slot.available);

	if (slots.length === 0) {
		return (
			<p class="mt-6 rounded-xl border border-dashed px-6 py-10 text-center text-muted-foreground">
				{teacher.name} no tiene horarios disponibles por ahora. Probá con otro
				profesor o volvé más tarde.
			</p>
		);
	}

	return (
		<>
			<ol class="@container mt-6 divide-y rounded-xl border">
				{groupByDay(slots).map((daySlots) => (
					<li
						key={daySlots[0]._id}
						class="grid gap-3 p-4 @lg:grid-cols-[11rem_1fr] @lg:gap-4"
					>
						<h3 class="text-sm font-medium first-letter:uppercase @lg:pt-2.5">
							{formatDayLong(daySlots[0].startsAt)}
						</h3>
						<ul class="flex flex-wrap gap-2">
							{daySlots.map((slot) => (
								<li key={slot._id}>
									<SlotButton
										slot={slot}
										onSelect={() => {
											setSelected(slot);
											setDialogOpen(true);
										}}
									/>
								</li>
							))}
						</ul>
					</li>
				))}
			</ol>
			{selected && (
				<BookingDialog
					key={selected._id}
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					teacher={teacher}
					slot={selected}
					available={selectedAvailable}
				/>
			)}
		</>
	);
}

function SlotButton({ slot, onSelect }: { slot: Slot; onSelect: () => void }) {
	const time = formatTime(slot.startsAt);
	if (!slot.available) {
		return (
			<Button
				variant="outline"
				size="slot"
				disabled
				aria-label={`${time}, reservado`}
			>
				<span class="tabular-nums line-through">{time}</span>
				<span class="text-xs font-normal">Reservado</span>
			</Button>
		);
	}
	return (
		<Button
			variant="outline"
			size="slot"
			class="min-w-18 tabular-nums hover:border-foreground/40"
			aria-label={`Reservar ${formatDayLong(slot.startsAt)} a las ${time}`}
			aria-haspopup="dialog"
			onClick={onSelect}
		>
			{time}
		</Button>
	);
}
