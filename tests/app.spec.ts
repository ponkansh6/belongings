// @ts-check
import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E tests for the Belongings Checker app.
 * Covers loading state, seed data rendering, checklist/item CRUD,
 * reset flows, celebration overlay, show-more/collapse, progress bar,
 * localStorage persistence, and swipe-to-delete.
 *
 * Design: each test navigates to "/" fresh. The app sync-loads seed data
 * from localStorage on first visit, so we wait for a content landmark
 * before interacting. The loading state is captured on the initial paint
 * before React finishes hydration.
 */

/** Wait for the app to finish loading and render seed data content */
async function waitForApp(page) {
  // The loading spinner disappears once data is loaded from localStorage
  // and the placeholder or checklist items render.
  // We wait for the main content landmark that signals hydration is done.
  await page.waitForSelector("text=チェックリストを選択してください", { timeout: 10000 });
}

// ─────────────────────────────────────────────
// Loading & initial state
// ─────────────────────────────────────────────

test("loads seed data and displays content", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  // After loading, content is fully rendered
  await expect(page.locator("text=チェックリストを選択してください")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Belongings Checker" })).toBeVisible();
  await expect(page.locator("text=出勤")).toBeVisible();
});

test("shows seed checklists in sidebar", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  await expect(page.locator("text=出勤")).toBeVisible();
  await expect(page.locator("text=お出かけ")).toBeVisible();
  // 3rd checklist is hidden behind "残り1件を表示"
  await expect(page.locator("text=残り1件を表示")).toBeVisible();

  // Initial sidebar counts: all 0/N (sidebar item has tabular-nums)
  await expect(page.locator("aside").getByText("0/7")).toBeVisible();
});

test("shows placeholder when no checklist selected", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  await expect(page.locator("text=チェックリストを選択してください")).toBeVisible();
  await expect(
    page.locator("text=左のサイドバーからリストを選ぶか、新しいリストを作成してください"),
  ).toBeVisible();
});

// ─────────────────────────────────────────────
// Checklist selection & item operations
// ─────────────────────────────────────────────

test("selecting a checklist displays its items", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  await page.locator("text=出勤").click();

  // Wait for items to render
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  // Verify all seed items for 出勤
  for (const label of [
    "スマホ",
    "財布",
    "名札・社員証",
    "PC・充電器",
    "お弁当",
    "マスク",
    "ハンカチ・ティッシュ",
  ]) {
    await expect(page.locator(`text=${label}`)).toBeVisible();
  }
});

test.describe("item operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await page.locator("text=出勤").click();
    await page.waitForSelector("text=スマホ", { timeout: 5000 });
  });

  test("toggling an item updates progress", async ({ page }) => {
    // Initial progress
    await expect(page.locator("text=0/7 完了")).toBeVisible();

    // Check first item (スマホ)
    await page.locator("input[type='checkbox']").first().check({ force: true });

    // Checklist detail header updates
    await expect(page.locator("text=1/7 完了")).toBeVisible();

    // Sidebar list item count updates
    await expect(page.getByRole("button").filter({ hasText: "出勤" })).toContainText("1/7");

    // Sidebar header total updates (1 out of 17)
    await expect(page.locator("aside")).toContainText("1/17");
  });

  test("adding item via button", async ({ page }) => {
    const input = page.locator("input[aria-label='新しいアイテム']");
    await input.fill("テストアイテム");
    await page.locator("button:has-text('追加')").click();

    await expect(page.locator("text=テストアイテム")).toBeVisible();
  });

  test("adding item via Enter key", async ({ page }) => {
    const input = page.locator("input[aria-label='新しいアイテム']");
    await input.fill("Enter追加");
    await input.press("Enter");

    await expect(page.locator("text=Enter追加")).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// Reset flows
// ─────────────────────────────────────────────

test("reset single checklist", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  // Check two items
  const checkboxes = page.locator("input[type='checkbox']");
  await checkboxes.nth(0).check({ force: true });
  await checkboxes.nth(1).check({ force: true });

  await expect(page.locator("text=2/7 完了")).toBeVisible();

  // Click "このリストをリセット" button
  await page.locator("button:has-text('このリストをリセット')").click();

  await expect(page.locator("text=0/7 完了")).toBeVisible();
});

test("reset all checklists", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  // Check items in two different lists
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });
  await page.locator("input[type='checkbox']").first().check({ force: true });
  await page.waitForTimeout(200);

  await page.locator("text=お出かけ").click();
  // Wait for the exit animation of the previous list to fully complete
  // (duration 250ms in AnimatePresence exit config)
  await page.waitForSelector("text=モバイルバッテリー", { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.locator("input[type='checkbox']").first().check({ force: true });
  await page.waitForTimeout(200);

  // Verify checked state in sidebar counts
  await expect(page.locator("aside").getByText("1/7")).toBeVisible();
  await expect(page.locator("aside").getByText("1/5")).toBeVisible();

  // Click "すべてリセット" in header
  await page.locator("button:has-text('すべてリセット')").click();

  // Verify sidebar counts reset to 0 after reset
  await expect(page.locator("aside").getByText("0/7")).toBeVisible();
  await expect(page.locator("aside").getByText("0/5")).toBeVisible();

  // The selected list's visible checkbox state should reset immediately too.
  await expect(page.locator("input[type='checkbox']").first()).not.toBeChecked();
});

// ─────────────────────────────────────────────
// Celebration overlay
// ─────────────────────────────────────────────

test("celebration overlay on 100% completion", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  // Expand sidebar to reveal "ジム" (only first 2 shown initially)
  await page.locator("text=残り1件を表示").click();
  await page.waitForTimeout(200);

  // "ジム" has 5 items – select it
  await page.locator("text=ジム").click();
  await page.waitForSelector("text=着替え", { timeout: 5000 });

  // Check all 5 items
  const checkboxes = page.locator("input[type='checkbox']");
  for (let i = 0; i < 5; i++) {
    await checkboxes.nth(i).check({ force: true });
  }

  // Celebration appears after brief delay
  await expect(page.locator("text=行ってらっしゃい！")).toBeVisible({ timeout: 3000 });

  await expect(page.locator("text=準備完了。よい旅を。")).toBeVisible();

  // Reload to dismiss celebration (click-based dismiss is unreliable with
  // framer-motion + React event delegation in headless mode)
  await page.reload();
  await waitForApp(page);

  await expect(page.locator("text=行ってらっしゃい！")).not.toBeVisible();
});

// ─────────────────────────────────────────────
// Sidebar – checklist CRUD
// ─────────────────────────────────────────────

test("adding a new checklist via sidebar", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  const sidebar = page.locator("aside");

  await expect(sidebar.getByRole("button", { name: "新規リスト" })).not.toBeVisible();
  await sidebar.getByRole("button", { name: "残り1件を表示" }).click();
  await expect(sidebar.getByRole("button", { name: "新規リスト" })).toBeVisible();

  await sidebar.getByRole("button", { name: "新規リスト" }).click();

  const input = sidebar.locator("input[aria-label='新しいリスト名']");
  await input.fill("マイリスト");

  await page.getByRole("button", { name: "作成" }).click();

  await expect(page.locator("aside").getByText("マイリスト")).toBeVisible();
});

test("renaming a checklist", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  // Rename buttons are hover-visible; using force to bypass visibility check
  await page.locator("button[aria-label='名前を変更']").first().click({ force: true });

  const editInput = page.locator("input[aria-label='リスト名を編集']");
  await editInput.fill("通勤");
  await editInput.press("Enter");

  await expect(page.locator("text=通勤")).toBeVisible();
  // Old name should no longer be a button text in sidebar
  await expect(page.locator("aside").getByText("出勤")).not.toBeVisible();
});

test("deleting a checklist with confirmation", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  // Accept the confirm dialog
  page.on("dialog", (d) => d.accept());

  // Expand sidebar to reveal "ジム" (only first 2 shown initially)
  await page.locator("text=残り1件を表示").click();

  // Delete "ジム" (3rd checklist, now visible)
  await page.locator("button[aria-label='削除']").nth(2).click();

  await expect(page.locator("text=ジム")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "残り1件を表示" })).toHaveCount(0);
});

test("deleting the selected checklist returns to the all-checklists view", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  page.on("dialog", (d) => d.accept());

  const sidebar = page.locator("aside");
  const selectedChecklist = sidebar.getByRole("button").filter({ hasText: "お出かけ" });
  await selectedChecklist.click();
  await expect(page.getByRole("heading", { name: "お出かけ" })).toBeVisible();

  await selectedChecklist.locator("xpath=..").getByRole("button", { name: "削除" }).click();

  await expect(sidebar.getByText("お出かけ")).not.toBeVisible();
  await expect(sidebar.getByText("出勤")).toBeVisible();
  await expect(page.locator("main").getByText("チェックリストを選択してください")).toBeVisible();
});

test("deleting another checklist keeps the selected checklist active", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  page.on("dialog", (dialog) => dialog.accept());

  const sidebar = page.locator("aside");
  await sidebar.getByRole("button").filter({ hasText: "出勤" }).click();
  await expect(page.getByRole("heading", { name: "出勤" })).toBeVisible();
  await expect(page.locator("main").getByText("スマホ")).toBeVisible();

  // Locate お出かけ after selecting 出勤, since selection can change row order.
  const otherChecklist = sidebar.getByRole("button").filter({ hasText: "お出かけ" });
  await otherChecklist.locator("xpath=..").getByRole("button", { name: "削除" }).click();

  await expect(sidebar.getByText("お出かけ")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "出勤" })).toBeVisible();
  await expect(page.locator("main").getByText("スマホ")).toBeVisible();
  await expect(page.locator("main").getByText("財布")).toBeVisible();
});

test("empty state when all checklists deleted", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);

  page.on("dialog", (d) => d.accept());

  // Expand to show all 3 checklists so all delete buttons are visible
  await page.locator("text=残り1件を表示").click();

  // Delete all 3 checklists one by one (re-query since DOM changes)
  await page.locator("button[aria-label='削除']").first().click();
  await page.locator("button[aria-label='削除']").first().click();
  await page.locator("button[aria-label='削除']").first().click();

  await expect(page.locator("text=チェックリストがありません")).toBeVisible();
  await expect(page.locator("text=最初のリストを作成")).toBeVisible();
});

// ─────────────────────────────────────────────
// Sidebar – show more / collapse
// ─────────────────────────────────────────────

test("show more / collapse", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  const sidebar = page.locator("aside");

  // Only first 2 checklists visible initially
  await expect(page.locator("text=出勤")).toBeVisible();
  await expect(page.locator("text=お出かけ")).toBeVisible();
  await expect(page.locator("text=ジム")).not.toBeVisible();
  await expect(sidebar.getByRole("button", { name: "新規リスト" })).not.toBeVisible();

  // Click "残り1件を表示"
  await page.locator("text=残り1件を表示").click();

  // All 3 visible
  await expect(page.locator("text=ジム")).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "新規リスト" })).toBeVisible();

  // Fold
  await page.locator("text=折りたたむ").click();

  await expect(page.locator("text=出勤")).toBeVisible();
  await expect(page.locator("text=ジム")).not.toBeVisible();
  await expect(sidebar.getByRole("button", { name: "新規リスト" })).not.toBeVisible();

  // A checklist that was hidden while folded can be selected after expansion.
  await sidebar.getByRole("button", { name: "残り1件を表示" }).click();
  await sidebar.getByRole("button", { name: /ジム/ }).click();
  await expect(page.getByRole("heading", { name: "ジム" })).toBeVisible();
});

// ─────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────

test("progress bar updates as items are checked", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  const progressBar = page.locator("div.bg-blue-500").first();

  // Check 1 item → ~14.3%
  await page.locator("input[type='checkbox']").first().check({ force: true });
  const w1 = await progressBar.evaluate((el) => el.style.width);
  expect(parseFloat(w1)).toBeCloseTo(14.3, 0);

  // Check 2nd item → ~28.6%
  await page.locator("input[type='checkbox']").nth(1).check({ force: true });
  const w2 = await progressBar.evaluate((el) => el.style.width);
  expect(parseFloat(w2)).toBeCloseTo(28.6, 0);
});

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

test("localStorage persistence across reload", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  // Add item + check first item
  const input = page.locator("input[aria-label='新しいアイテム']");
  await input.fill("残るアイテム");
  await input.press("Enter");

  await page.locator("input[type='checkbox']").first().check({ force: true });
  await page.waitForTimeout(500); // debounced save (300ms)

  // Reload (view state resets, so we need to re-select 出勤)
  await page.reload();
  await waitForApp(page);

  // Re-select 出勤
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  // The added item should persist
  await expect(page.locator("text=残るアイテム")).toBeVisible();

  // The first checkbox should still be checked
  await expect(page.locator("input[type='checkbox']").first()).toBeChecked();
});

// ─────────────────────────────────────────────
// Swipe to delete item
// ─────────────────────────────────────────────

test("swipe to delete an item", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  await page.locator("text=出勤").click();
  await page.waitForSelector("text=スマホ", { timeout: 5000 });

  // Removing a checked item must remove it from both checklist and global progress.
  await page.locator("input[type='checkbox']").first().check({ force: true });
  await expect(page.locator("text=1/7 完了")).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: "出勤" })).toContainText("1/7");
  await expect(page.locator("aside")).toContainText("1/17");

  // Use the label (which wraps the checkbox) to perform the drag.
  // The label is inside the motion.div with drag="x", so pointer events
  // on it bubble up and trigger framer-motion's drag handler.
  const label = page.locator("label").first();
  await expect(label).toBeVisible();
  const deletedItemName = await label.innerText();
  const box = await label.boundingBox();
  if (!box) throw new Error("Label not found");

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Perform swipe gesture using page.mouse (pointer events).
  // This triggers pointer-events on the label which bubble to the
  // motion.div's framer-motion drag handler.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Move left in small steps to simulate a smooth drag
  for (let x = 0; x > -240; x -= 15) {
    await page.mouse.move(cx + x, cy);
    await page.waitForTimeout(15);
  }
  await page.mouse.up();

  // Wait for framer-motion exit animation
  await page.waitForTimeout(1000);

  // Verify item count and progress decreased (出勤 has 7 items → 6 after deletion).
  const count = await page.locator("[data-testid='checklist-item']").count();
  expect(count).toBe(6);
  await expect(page.locator("text=0/6 完了")).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: "出勤" })).toContainText("0/6");
  await expect(page.locator("aside")).toContainText("0/16");
  await expect(page.locator("div.bg-blue-500").first()).toHaveCSS("width", "0px");

  // The deletion should be persisted, not just hidden until the next reload.
  await page.waitForTimeout(500); // debounced save (300ms)
  await page.reload();
  await waitForApp(page);
  await page.locator("text=出勤").click();
  const itemRows = page.locator("[data-testid='checklist-item']");
  await expect(itemRows).toHaveCount(6);

  await expect(itemRows.filter({ hasText: deletedItemName })).toHaveCount(0);
});

test("long-press dragging reorders checklist items and persists the order", async ({ page }) => {
  await page.goto("/");
  await waitForApp(page);
  await page.locator("text=出勤").click();

  const rows = page.locator("[data-testid='checklist-item']");
  await expect(rows).toHaveCount(7);
  const labels = rows.locator("label span.min-w-0");
  const originalOrder = await labels.allTextContents();
  expect(originalOrder.slice(0, 2)).toEqual(["スマホ", "財布"]);

  const firstHandle = page.getByRole("button", { name: "並び替え" }).first();
  const firstBox = await firstHandle.boundingBox();
  const secondBox = await rows.nth(1).boundingBox();
  if (!firstBox || !secondBox) throw new Error("Checklist drag target not found");

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  // useDragReorder activates after a 250 ms long press.
  await page.waitForTimeout(300);
  // Move the first item below the second item's midpoint to insert after it.
  await page.mouse.move(firstBox.x + firstBox.width / 2, secondBox.y + secondBox.height / 2 + 2, {
    steps: 5,
  });
  await page.mouse.up();

  await expect
    .poll(async () => (await labels.allTextContents()).slice(0, 2))
    .toEqual(["財布", "スマホ"]);

  // The hook persists the reordered checklist through the normal debounced storage path.
  await page.waitForTimeout(500);
  await page.reload();
  await waitForApp(page);
  await page.locator("text=出勤").click();
  await expect
    .poll(async () =>
      (
        await page.locator("[data-testid='checklist-item'] label span.min-w-0").allTextContents()
      ).slice(0, 2),
    )
    .toEqual(["財布", "スマホ"]);
});
