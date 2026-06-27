import { test, expect } from "@playwright/test";

test("opacity restores after cancelled drag in real browser", async ({ page }) => {
  // Navigate to the app
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Find the first drag handle (button with aria-label="並び替え")
  const handle = page.getByLabel("並び替え").first();
  await expect(handle).toBeVisible();

  // Get the parent checklist-item (motion.div with layout)
  const item = page.locator("[data-testid='checklist-item']").first();

  // Get handle center coordinates
  const box = await handle.boundingBox();
  if (!box) throw new Error("Handle not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // ---- Phase 1: Long-press to activate drag ----

  // Move to handle center
  await page.mouse.move(cx, cy);
  await page.mouse.down();

  // Wait for long-press threshold (250ms in useDragReorder.ts)
  await page.waitForTimeout(300);

  // ---- Phase 2: Move down to shift insertion point ----
  await page.mouse.move(cx + 2, cy + 40, { steps: 5 });

  // ---- Phase 3: Return to original position (cancel the drag) ----
  await page.mouse.move(cx, cy, { steps: 5 });
  await page.mouse.up();

  // ---- Phase 4: Wait for Framer Motion layout animation to settle ----
  await page.waitForTimeout(800);

  // ---- Assert: computed opacity should be restored to 1 ----
  const opacity = await item.evaluate(
    (el) => getComputedStyle(el).opacity,
  );
  expect(opacity).toBe("1");
});
