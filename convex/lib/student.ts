import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

// The student is whoever Better Auth authenticated; never trust an id from args.
// A JWT outlives sign-out by up to 15 min, so also require its session to be live.
export async function getStudentId(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity || !(await authComponent.safeGetAuthUser(ctx))) return null;
	return identity.tokenIdentifier;
}

export async function requireStudentId(ctx: QueryCtx | MutationCtx) {
	const studentId = await getStudentId(ctx);
	if (!studentId) throw new ConvexError("Iniciá sesión para continuar.");
	return studentId;
}
