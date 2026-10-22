import { useEffect, useState } from "preact/hooks";

export type Toast = {
	id: number;
	kind: "success" | "error" | "info";
	message: string;
	action?: { label: string; onClick: () => void };
};

let toasts: Array<Toast> = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => {
	for (const listener of listeners) listener();
};

export function dismiss(id: number) {
	toasts = toasts.filter((t) => t.id !== id);
	emit();
}

function show(
	kind: Toast["kind"],
	message: string,
	{
		duration = 4_000,
		action,
	}: { duration?: number; action?: Toast["action"] } = {},
) {
	const id = nextId++;
	toasts = [...toasts, { id, kind, message, action }];
	emit();
	setTimeout(() => dismiss(id), duration);
}

export const toast = {
	success: (message: string) => show("success", message),
	error: (message: string) => show("error", message),
	info: show.bind(null, "info"),
};

export function useToasts() {
	const [current, setCurrent] = useState(toasts);
	useEffect(() => {
		const update = () => setCurrent(toasts);
		listeners.add(update);
		update();
		return () => {
			listeners.delete(update);
		};
	}, []);
	return current;
}
