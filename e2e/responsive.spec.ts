import { expect, test } from "@playwright/test";

const PROFILE = "/profesores/valentina-rios";
const PAGES = ["/", PROFILE, "/login", "/mis-clases"];

// 482, 500 and 544 sit near the profile's container breakpoint (512 px of list),
// where the slots have the least room.
for (const width of [320, 375, 393, 482, 500, 544, 768, 820, 1024, 1194]) {
	test(`layout fits at ${width} px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		for (const path of PAGES) {
			await page.goto(path);
			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			}));
			expect(scrollWidth, path).toBeLessThanOrEqual(clientWidth);
		}

		// A day's slots stay in one row (320 px is too narrow for a day with a
		// "Reservado" button). From tablets up they sit beside the label: the list
		// is wide enough there, not a narrow second column.
		if (width < 375) return;
		await page.goto(PROFILE);
		const days = page.locator("ol > li");
		await expect(days.first()).toBeVisible();
		for (const day of await days.all()) {
			const tops = await day
				.locator("h3, li")
				.evaluateAll((els) =>
					els.map((el) => Math.round(el.getBoundingClientRect().top)),
				);
			// The label sits 10 px lower (pt-2.5) to line up with the buttons' text.
			expect(new Set(tops.slice(1)).size, "slots in one row").toBe(1);
			if (width >= 768)
				expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(12);
		}
	});
}
