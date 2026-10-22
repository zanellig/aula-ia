// A ConvexError carries a message for the user in `data`. Checked by shape so
// islands don't import convex/values just for the class.
export const errorMessage = (err: unknown) =>
	err instanceof Error && "data" in err
		? String(err.data)
		: "Algo salió mal. Probá de nuevo.";
