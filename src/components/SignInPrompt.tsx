import { LogIn } from "lucide-preact";
import { buttonClass } from "./ui";

export function SignInPrompt({
	title,
	description,
	redirect,
}: {
	title: string;
	description: string;
	redirect: string;
}) {
	return (
		<section class="mx-auto max-w-md rounded-xl border bg-card px-6 py-10 text-center">
			<h1 class="text-xl font-semibold tracking-tight">{title}</h1>
			<p class="mt-2 text-muted-foreground">{description}</p>
			<a
				href={`/login?redirect=${encodeURIComponent(redirect)}`}
				class={buttonClass({ size: "lg" }, "mt-6")}
			>
				<LogIn data-icon="inline-start" aria-hidden="true" />
				Iniciar sesión
			</a>
		</section>
	);
}
