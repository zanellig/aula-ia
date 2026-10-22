import { formatDayShort, formatTime } from "../lib/format";

/** The teacher card's next free slot. */
export function NextAvailable({ at }: { at: number | null }) {
	return at === null ? (
		<span class="text-muted-foreground">Sin horarios disponibles</span>
	) : (
		<span>
			<span class="text-muted-foreground">Próximo horario: </span>
			<span class="font-medium">
				{formatDayShort(at)}, {formatTime(at)}
			</span>
		</span>
	);
}
