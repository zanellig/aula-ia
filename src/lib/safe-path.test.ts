import { expect, test } from "vitest";
import { safePath } from "./safe-path";

test("safePath keeps same-origin paths", () => {
	for (const path of [
		"/",
		"/mis-clases",
		"/reservas/abc",
		"/profesores/x?y=1#z",
	]) {
		expect(safePath(path)).toBe(path);
	}
});

test("safePath rejects anything that leaves the origin", () => {
	for (const value of [
		"//example.org",
		"/\\example.org",
		"/\t/example.org",
		"/\n/example.org",
		"/\r/example.org",
		"/.//example.org",
		"/a/..//example.org",
		"https://example.org",
		"javascript:alert(1)",
		123,
		null,
		undefined,
		["/"],
	]) {
		expect(safePath(value)).toBeUndefined();
	}
});
