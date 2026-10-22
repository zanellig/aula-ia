import { Check, X } from "lucide-preact";
import { Badge } from "./ui";

// Icon + text, so the status never depends on color alone.
export const StatusBadge = ({
	status,
}: {
	status: "confirmed" | "cancelled";
}) =>
	status === "confirmed" ? (
		<Badge>
			<Check data-icon="inline-start" aria-hidden="true" />
			Confirmada
		</Badge>
	) : (
		<Badge variant="secondary">
			<X data-icon="inline-start" aria-hidden="true" />
			Cancelada
		</Badge>
	);
