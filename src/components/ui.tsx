import type { ComponentChildren, ComponentProps } from "preact";

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
