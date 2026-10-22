import { X } from "lucide-preact";
import type { ComponentChildren, ComponentProps } from "preact";
import { useEffect, useRef } from "preact/hooks";

// Ported from the shadcn components of krew-prueba-tecnica. There is no
// tailwind-merge here, so each utility lives in exactly one place (base or
// variant) and callers only add classes that don't conflict with them.

export const cx = (...classes: Array<string | false | null | undefined>) =>
	classes.filter(Boolean).join(" ");

const buttonVariants = {
	default:
		"border-transparent bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-ring/50",
	outline:
		"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground focus-visible:border-ring focus-visible:ring-ring/50",
	ghost:
		"border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground focus-visible:border-ring focus-visible:ring-ring/50",
	destructive:
		"border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
	link: "border-transparent text-primary underline-offset-4 hover:underline focus-visible:border-ring focus-visible:ring-ring/50",
};

const buttonSizes = {
	default:
		"h-8 gap-1.5 rounded-lg px-2.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
	sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
	lg: "h-9 gap-1.5 rounded-lg px-2.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
	"icon-sm":
		"size-7 rounded-[min(var(--radius-md),12px)] text-sm [&_svg:not([class*='size-'])]:size-4",
	// A slot time: taller and wider than the default size.
	slot: "h-auto gap-1.5 rounded-lg px-3 py-2.5 text-sm [&_svg:not([class*='size-'])]:size-4",
};

type ButtonStyle = {
	variant?: keyof typeof buttonVariants;
	size?: keyof typeof buttonSizes;
};

/** Button classes, also for links that look like buttons. */
export const buttonClass = (
	{ variant = "default", size = "default" }: ButtonStyle = {},
	className?: string,
) =>
	cx(
		"inline-flex shrink-0 items-center justify-center border bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		buttonVariants[variant],
		buttonSizes[size],
		className,
	);

export function Button({
	variant,
	size,
	class: className,
	type = "button",
	...props
}: ButtonStyle & ComponentProps<"button">) {
	return (
		<button
			type={type}
			class={buttonClass({ variant, size }, className as string)}
			{...props}
		/>
	);
}

const badgeVariants = {
	default: "border-transparent bg-primary text-primary-foreground",
	secondary: "border-transparent bg-secondary text-secondary-foreground",
	outline: "border-border text-foreground",
};

export function Badge({
	variant = "default",
	children,
}: {
	variant?: keyof typeof badgeVariants;
	children: ComponentChildren;
}) {
	return (
		<span
			class={cx(
				"inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
				badgeVariants[variant],
			)}
		>
			{children}
		</span>
	);
}

export function Alert({
	variant = "default",
	children,
}: {
	variant?: "default" | "destructive";
	children: ComponentChildren;
}) {
	return (
		<div
			role="alert"
			class={cx(
				"group/alert relative grid w-full gap-0.5 rounded-lg border bg-card px-2.5 py-2 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
				variant === "destructive"
					? "text-destructive *:data-[slot=alert-description]:text-destructive/90"
					: "text-card-foreground",
			)}
		>
			{children}
		</div>
	);
}

export const AlertTitle = ({ children }: { children: ComponentChildren }) => (
	<div class="font-medium group-has-[>svg]/alert:col-start-2">{children}</div>
);

export const AlertDescription = ({
	children,
}: {
	children: ComponentChildren;
}) => (
	<div
		data-slot="alert-description"
		class="text-sm text-balance text-muted-foreground md:text-pretty"
	>
		{children}
	</div>
);

const field =
	"w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

export const Input = (props: ComponentProps<"input">) => (
	<input class={cx(field, "h-8 py-1")} {...props} />
);

export const Textarea = (props: ComponentProps<"textarea">) => (
	<textarea
		class={cx(field, "flex field-sizing-content min-h-16 py-2")}
		{...props}
	/>
);

export const Label = (props: ComponentProps<"label">) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: callers pass `for` and the text.
	<label
		class="flex items-center gap-2 text-sm leading-none font-medium select-none"
		{...props}
	/>
);

export const Skeleton = ({ class: className }: { class: string }) => (
	<div class={cx("animate-pulse rounded-md bg-muted", className)} />
);

/**
 * A modal <dialog>: the browser traps focus, closes it on Esc and makes the
 * rest of the page inert. A click on the backdrop closes it too.
 */
export function Dialog({
	open,
	onClose,
	wide = false,
	labelledBy,
	describedBy,
	children,
}: {
	open: boolean;
	onClose: () => void;
	wide?: boolean;
	labelledBy: string;
	describedBy: string;
	children: ComponentChildren;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = ref.current;
		if (open && !dialog?.open) dialog?.showModal();
		if (!open && dialog?.open) dialog.close();
	}, [open]);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Esc already closes a modal dialog.
		<dialog
			ref={ref}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			onClose={onClose}
			// Only the backdrop targets the <dialog> itself: the content fills it.
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			class={cx(
				"m-auto w-full max-w-[calc(100%-2rem)] rounded-xl bg-popover p-0 text-sm text-popover-foreground ring-1 ring-foreground/10 transition duration-100 backdrop:bg-black/10 backdrop:backdrop-blur-xs starting:open:scale-95 starting:open:opacity-0",
				wide ? "sm:max-w-md" : "sm:max-w-sm",
			)}
		>
			<div class="relative grid gap-4 p-4">
				{children}
				<Button
					variant="ghost"
					size="icon-sm"
					class="absolute top-2 right-2"
					onClick={onClose}
				>
					<X />
					<span class="sr-only">Cerrar</span>
				</Button>
			</div>
		</dialog>
	);
}

export const DialogHeader = ({ children }: { children: ComponentChildren }) => (
	<div class="flex flex-col gap-2">{children}</div>
);

export const DialogTitle = ({
	id,
	children,
}: {
	id: string;
	children: ComponentChildren;
}) => (
	<h2 id={id} class="text-base leading-none font-medium">
		{children}
	</h2>
);

export const DialogDescription = ({
	id,
	class: className,
	children,
}: {
	id: string;
	class?: string;
	children: ComponentChildren;
}) => (
	<p id={id} class={cx("text-sm text-muted-foreground", className)}>
		{children}
	</p>
);

export const DialogFooter = ({ children }: { children: ComponentChildren }) => (
	<div class="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
		{children}
	</div>
);
