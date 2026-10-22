import { cx } from "./ui";

function initials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

/** Photo over the initials, so the initials show if the photo fails. */
export function TeacherAvatar({
	name,
	photoUrl,
	class: size = "size-12",
}: {
	name: string;
	photoUrl: string;
	/** A size utility, such as "size-14". */
	class?: string;
}) {
	return (
		<span
			class={cx(
				"relative flex shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken",
				size,
			)}
		>
			<span
				aria-hidden="true"
				class="flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground/70"
			>
				{initials(name)}
			</span>
			{/* ponytail: a broken photo with alt="" renders nothing, so the initials
			    show without an onerror handler, also in HTML that never hydrates. */}
			<img
				src={photoUrl}
				alt=""
				width={192}
				height={192}
				decoding="async"
				class="absolute inset-0 size-full rounded-full object-cover"
			/>
		</span>
	);
}
