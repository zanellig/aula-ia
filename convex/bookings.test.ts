/// <reference types="vite/client" />
import betterAuth from "@convex-dev/better-auth/test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 20, 12); // Tuesday 2026-10-20 09:00 ART
const TOPIC = "Quiero aprender RAG";

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
});

type T = ReturnType<typeof convexTest>;

// A Better Auth user with a live session, and the JWT identity Convex would see.
async function signUp(t: T, name: string) {
	return await t.run(async (ctx) => {
		const create = components.betterAuth.adapter.create;
		const user = await ctx.runMutation(create, {
			input: {
				model: "user",
				data: {
					name,
					email: `${name}@test.dev`,
					emailVerified: false,
					createdAt: NOW,
					updatedAt: NOW,
				},
			},
		});
		const session = await ctx.runMutation(create, {
			input: {
				model: "session",
				data: {
					userId: user._id,
					token: name,
					expiresAt: NOW + 7 * 24 * HOUR,
					createdAt: NOW,
					updatedAt: NOW,
				},
			},
		});
		return {
			tokenIdentifier: `test|${name}`,
			subject: user._id as string,
			sessionId: session._id as string,
		};
	});
}

async function setup() {
	const t = convexTest(schema, modules);
	betterAuth.register(t);
	rateLimiter.register(t);
	const ids = await t.run(async (ctx) => {
		const base = {
			bio: "Bio",
			headline: "Headline",
			specialties: ["IA"],
		};
		const teacherA = await ctx.db.insert("teachers", {
			...base,
			slug: "a",
			name: "Ana Docente",
			photoUrl: "/teachers/a.webp",
		});
		const teacherB = await ctx.db.insert("teachers", {
			...base,
			slug: "b",
			name: "Bruno Docente",
			photoUrl: "/teachers/b.webp",
		});
		const slot = (teacherId: typeof teacherA, startsAt: number) =>
			ctx.db.insert("slots", { teacherId, startsAt, durationMin: 60 });
		return {
			teacherA,
			past: await slot(teacherA, NOW - HOUR),
			s1: await slot(teacherA, NOW + HOUR),
			s2: await slot(teacherA, NOW + 2 * HOUR),
			// Teacher B at NOW+1h30: overlaps s1 and s2.
			bOverlap: await slot(teacherB, NOW + 1.5 * HOUR),
		};
	});
	const ana = await signUp(t, "ana");
	const beto = await signUp(t, "beto");
	return { t, ana, beto, ...ids };
}

type Setup = Awaited<ReturnType<typeof setup>>;

// Inserted directly: create rejects the past and rate-limits churn.
async function insertBookings(
	{ t, ana, s1, teacherA }: Setup,
	count: number,
	fields: Pick<Doc<"bookings">, "startsAt" | "status">,
) {
	await t.run(async (ctx) => {
		for (let i = 0; i < count; i++) {
			await ctx.db.insert("bookings", {
				slotId: s1,
				teacherId: teacherA,
				studentId: ana.tokenIdentifier,
				durationMin: 60,
				topic: TOPIC,
				...fields,
			});
		}
	});
}

describe("bookings.create", () => {
	test("books the slot and marks it taken", async () => {
		const { t, ana, s1, s2 } = await setup();
		const before = await t.query(api.teachers.list, {});
		expect(before.map((x) => x.name)).toEqual(["Ana Docente", "Bruno Docente"]);
		expect(before[0].nextAvailableAt).toBe(NOW + HOUR);

		const id = await t
			.withIdentity(ana)
			.mutation(api.bookings.create, { slotId: s1, topic: `  ${TOPIC}  ` });

		const page = await t.query(api.teachers.getBySlug, { slug: "a" });
		expect(page?.slots.map((s) => [s._id, s.available])).toEqual([
			[s1, false],
			[s2, true],
		]);
		const after = await t.query(api.teachers.list, {});
		expect(after[0].nextAvailableAt).toBe(NOW + 2 * HOUR);

		const view = await t.withIdentity(ana).query(api.bookings.get, {
			bookingId: id,
		});
		expect(view).toMatchObject({
			topic: TOPIC,
			status: "confirmed",
			startsAt: NOW + HOUR,
			durationMin: 60,
			teacher: { slug: "a", name: "Ana Docente" },
		});
	});

	test("second student cannot book a taken slot", async () => {
		const { t, ana, beto, s1 } = await setup();
		await t.withIdentity(ana).mutation(api.bookings.create, {
			slotId: s1,
			topic: TOPIC,
		});
		await expect(
			t.withIdentity(beto).mutation(api.bookings.create, {
				slotId: s1,
				topic: TOPIC,
			}),
		).rejects.toThrow("Ese horario ya fue reservado. Elegí otro.");
	});

	test("rejects past slot, bad topic, missing slot and anonymous user", async () => {
		const { t, ana, past, s1 } = await setup();
		const asAna = t.withIdentity(ana);
		await expect(
			asAna.mutation(api.bookings.create, { slotId: past, topic: TOPIC }),
		).rejects.toThrow("Ese horario ya pasó. Elegí otro.");
		for (const topic of ["", "   abc   ", "x".repeat(301)]) {
			await expect(
				asAna.mutation(api.bookings.create, { slotId: s1, topic }),
			).rejects.toThrow(
				"Contanos qué querés trabajar en la clase (entre 5 y 300 caracteres).",
			);
		}
		await expect(
			t.mutation(api.bookings.create, { slotId: s1, topic: TOPIC }),
		).rejects.toThrow("Iniciá sesión para continuar.");

		await t.run((ctx) => ctx.db.delete("slots", s1));
		await expect(
			asAna.mutation(api.bookings.create, { slotId: s1, topic: TOPIC }),
		).rejects.toThrow("Ese horario no existe.");
	});

	test("rejects an overlapping booking for the same student", async () => {
		const { t, ana, beto, s1, s2, bOverlap } = await setup();
		const asAna = t.withIdentity(ana);
		await asAna.mutation(api.bookings.create, { slotId: s1, topic: TOPIC });
		await expect(
			asAna.mutation(api.bookings.create, { slotId: bOverlap, topic: TOPIC }),
		).rejects.toThrow("Ya tenés otra clase reservada en ese horario.");
		// Back-to-back is fine.
		await asAna.mutation(api.bookings.create, { slotId: s2, topic: TOPIC });
		// Another student is not affected.
		await t
			.withIdentity(beto)
			.mutation(api.bookings.create, { slotId: bOverlap, topic: TOPIC });
	});
});

describe("bookings.cancel", () => {
	test("frees the slot for another student", async () => {
		const { t, ana, beto, s1 } = await setup();
		const id = await t
			.withIdentity(ana)
			.mutation(api.bookings.create, { slotId: s1, topic: TOPIC });
		await t.withIdentity(ana).mutation(api.bookings.cancel, { bookingId: id });

		const page = await t.query(api.teachers.getBySlug, { slug: "a" });
		expect(page?.slots[0]).toMatchObject({ _id: s1, available: true });
		await t
			.withIdentity(beto)
			.mutation(api.bookings.create, { slotId: s1, topic: TOPIC });
	});

	test("rejects non-owner, double cancel and started classes", async () => {
		const { t, ana, beto, s1 } = await setup();
		const id = await t
			.withIdentity(ana)
			.mutation(api.bookings.create, { slotId: s1, topic: TOPIC });
		await expect(
			t.withIdentity(beto).mutation(api.bookings.cancel, { bookingId: id }),
		).rejects.toThrow("No encontramos esa reserva.");

		vi.setSystemTime(NOW + HOUR);
		await expect(
			t.withIdentity(ana).mutation(api.bookings.cancel, { bookingId: id }),
		).rejects.toThrow("No se puede cancelar una clase que ya empezó.");

		vi.setSystemTime(NOW);
		await t.withIdentity(ana).mutation(api.bookings.cancel, { bookingId: id });
		await expect(
			t.withIdentity(ana).mutation(api.bookings.cancel, { bookingId: id }),
		).rejects.toThrow("La reserva ya estaba cancelada.");
	});
});

describe("bookings queries", () => {
	test("listMine returns only the caller's current and upcoming bookings", async () => {
		const ctx = await setup();
		const { t, ana, beto, s1, s2, bOverlap } = ctx;
		const asAna = t.withIdentity(ana);
		const cancelled = await asAna.mutation(api.bookings.create, {
			slotId: s1,
			topic: TOPIC,
		});
		await asAna.mutation(api.bookings.cancel, { bookingId: cancelled });
		await asAna.mutation(api.bookings.create, { slotId: s2, topic: TOPIC });
		await t
			.withIdentity(beto)
			.mutation(api.bookings.create, { slotId: bOverlap, topic: TOPIC });
		// A finished class and one in progress.
		await insertBookings(ctx, 1, {
			startsAt: NOW - 2 * HOUR,
			status: "confirmed",
		});
		await insertBookings(ctx, 1, {
			startsAt: NOW - HOUR / 2,
			status: "confirmed",
		});

		const mine = await asAna.query(api.bookings.listMine, {});
		expect(mine.map((b) => [b.startsAt, b.status])).toEqual([
			[NOW - HOUR / 2, "confirmed"],
			[NOW + HOUR, "cancelled"],
			[NOW + 2 * HOUR, "confirmed"],
		]);
		expect(await t.query(api.bookings.listMine, {})).toEqual([]);
	});

	test("get returns null for a non-owner or anonymous user", async () => {
		const { t, ana, beto, s1 } = await setup();
		const id = await t
			.withIdentity(ana)
			.mutation(api.bookings.create, { slotId: s1, topic: TOPIC });
		expect(
			await t.withIdentity(beto).query(api.bookings.get, { bookingId: id }),
		).toBeNull();
		expect(await t.query(api.bookings.get, { bookingId: id })).toBeNull();
	});

	// The old history-scan bug let a student go past the cap; those rows still exist.
	test("listMine keeps confirmed bookings over the cap", async () => {
		const ctx = await setup();
		const hours = [3, 4, 5, 6, 7, 8];
		for (const h of hours) {
			await insertBookings(ctx, 1, {
				startsAt: NOW + h * HOUR,
				status: "confirmed",
			});
		}
		const mine = await ctx.t
			.withIdentity(ctx.ana)
			.query(api.bookings.listMine, {});
		expect(mine.map((b) => b.startsAt)).toEqual(
			hours.map((h) => NOW + h * HOUR),
		);
	});

	test("listMine: finished cancellations don't hide upcoming ones", async () => {
		const ctx = await setup();
		await insertBookings(ctx, 20, {
			startsAt: NOW - 3 * HOUR,
			status: "cancelled",
		});
		await insertBookings(ctx, 1, { startsAt: NOW + HOUR, status: "cancelled" });
		const mine = await ctx.t
			.withIdentity(ctx.ana)
			.query(api.bookings.listMine, {});
		expect(mine.map((b) => [b.startsAt, b.status])).toEqual([
			[NOW + HOUR, "cancelled"],
		]);
	});
});

describe("session revocation", () => {
	const where = (sessionId: string) => [
		{ field: "_id" as const, value: sessionId },
	];

	test.each(["deleted", "expired"])(
		"a JWT whose session was %s has no booking access",
		async (how) => {
			const { t, ana, s1, s2 } = await setup();
			const asAna = t.withIdentity(ana);
			const id = await asAna.mutation(api.bookings.create, {
				slotId: s1,
				topic: TOPIC,
			});

			await t.run(async (ctx) => {
				if (how === "deleted") {
					await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
						input: { model: "session", where: where(ana.sessionId) },
					});
				} else {
					await ctx.runMutation(components.betterAuth.adapter.updateOne, {
						input: {
							model: "session",
							where: where(ana.sessionId),
							update: { expiresAt: NOW - 1 },
						},
					});
				}
			});

			await expect(
				asAna.mutation(api.bookings.create, { slotId: s2, topic: TOPIC }),
			).rejects.toThrow("Iniciá sesión para continuar.");
			await expect(
				asAna.mutation(api.bookings.cancel, { bookingId: id }),
			).rejects.toThrow("Iniciá sesión para continuar.");
			expect(await asAna.query(api.bookings.get, { bookingId: id })).toBeNull();
			expect(await asAna.query(api.bookings.listMine, {})).toEqual([]);
			// Ownership key is still the JWT's tokenIdentifier.
			const booking = await t.run((ctx) => ctx.db.get("bookings", id));
			expect(booking?.studentId).toBe(ana.tokenIdentifier);
		},
	);
});

describe("booking limits", () => {
	async function sixMoreSlots({ t, teacherA }: Setup) {
		return await t.run((ctx) =>
			Promise.all(
				[3, 4, 5, 6, 7, 8].map((h) =>
					ctx.db.insert("slots", {
						teacherId: teacherA,
						startsAt: NOW + h * HOUR,
						durationMin: 60,
					}),
				),
			),
		);
	}

	test("rate-limits rapid writes per student", async () => {
		const ctx = await setup();
		const slots = await sixMoreSlots(ctx);
		const asAna = ctx.t.withIdentity(ctx.ana);
		for (const slotId of slots.slice(0, 5)) {
			await asAna.mutation(api.bookings.create, { slotId, topic: TOPIC });
		}
		await expect(
			asAna.mutation(api.bookings.create, { slotId: slots[5], topic: TOPIC }),
		).rejects.toThrow("Hiciste muchos cambios seguidos");
		// Each student has their own bucket.
		await ctx.t
			.withIdentity(ctx.beto)
			.mutation(api.bookings.create, { slotId: slots[5], topic: TOPIC });
	});

	test("caps upcoming confirmed bookings per student", async () => {
		const ctx = await setup();
		const slots = await sixMoreSlots(ctx);
		const asAna = ctx.t.withIdentity(ctx.ana);
		const ids = [];
		for (const slotId of slots.slice(0, 5)) {
			ids.push(
				await asAna.mutation(api.bookings.create, { slotId, topic: TOPIC }),
			);
		}
		vi.setSystemTime(NOW + 60_000); // refill the rate-limit bucket
		await expect(
			asAna.mutation(api.bookings.create, { slotId: slots[5], topic: TOPIC }),
		).rejects.toThrow("Ya tenés 5 clases reservadas");

		await asAna.mutation(api.bookings.cancel, { bookingId: ids[0] });
		await asAna.mutation(api.bookings.create, {
			slotId: slots[5],
			topic: TOPIC,
		});
	});

	// 101 cancelled rows used to fill the .take(100) scans before any confirmed one.
	test("overlap check sees past a long cancelled history", async () => {
		const ctx = await setup();
		await insertBookings(ctx, 101, {
			startsAt: NOW - 10 * HOUR,
			status: "cancelled",
		});
		const asAna = ctx.t.withIdentity(ctx.ana);
		await asAna.mutation(api.bookings.create, { slotId: ctx.s1, topic: TOPIC });
		await expect(
			asAna.mutation(api.bookings.create, {
				slotId: ctx.bOverlap,
				topic: TOPIC,
			}),
		).rejects.toThrow("Ya tenés otra clase reservada en ese horario.");
	});

	test("cap and listMine see past a long cancelled history", async () => {
		const ctx = await setup();
		const slots = await sixMoreSlots(ctx);
		await insertBookings(ctx, 101, {
			startsAt: NOW + HOUR / 2,
			status: "cancelled",
		});
		const confirmed = [3, 4, 5, 6, 7].map((h) => NOW + h * HOUR);
		for (const startsAt of confirmed) {
			await insertBookings(ctx, 1, { startsAt, status: "confirmed" });
		}
		const asAna = ctx.t.withIdentity(ctx.ana);
		await expect(
			asAna.mutation(api.bookings.create, { slotId: slots[5], topic: TOPIC }),
		).rejects.toThrow("Ya tenés 5 clases reservadas");

		const mine = await asAna.query(api.bookings.listMine, {});
		const ofStatus = (status: string) =>
			mine.filter((b) => b.status === status).map((b) => b.startsAt);
		expect(ofStatus("confirmed")).toEqual(confirmed);
		expect(ofStatus("cancelled").length).toBeGreaterThan(0);
		expect(ofStatus("cancelled").length).toBeLessThanOrEqual(20);
	});
});

test("seed.run is idempotent", async () => {
	const t = convexTest(schema, modules);
	await t.mutation(internal.seed.run, {});
	const count = () =>
		t.run(async (ctx) => ({
			teachers: (await ctx.db.query("teachers").collect()).length,
			slots: (await ctx.db.query("slots").collect()).length,
			bookings: (await ctx.db.query("bookings").collect()).length,
		}));
	const first = await count();
	// Oct 20-29 has 8 weekdays x 3 slots x 5 teachers = 120, minus the two
	// 9:00 ART slots on day 0 that equal NOW and are skipped.
	expect(first.teachers).toBe(5);
	expect(first.slots).toBe(118);
	expect(first.bookings).toBe(3);

	await t.mutation(internal.seed.run, {});
	expect(await count()).toEqual(first);

	const slots = await t.run((ctx) => ctx.db.query("slots").collect());
	for (const s of slots) {
		const art = new Date(s.startsAt - 3 * HOUR);
		expect([0, 6]).not.toContain(art.getUTCDay());
		expect(art.getUTCHours()).toBeGreaterThanOrEqual(9);
		expect(art.getUTCHours()).toBeLessThanOrEqual(20);
		expect(s.startsAt).toBeGreaterThan(NOW);
	}
});
