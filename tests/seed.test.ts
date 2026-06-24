import { describe, it, expect } from "vitest";
import { SEED_CHECKLISTS } from "@/lib/seed";

describe("SEED_CHECKLISTS", () => {
  it("has at least 3 seed checklists", () => {
    expect(SEED_CHECKLISTS.length).toBeGreaterThanOrEqual(3);
  });

  it("every checklist has id, name, and items", () => {
    for (const cl of SEED_CHECKLISTS) {
      expect(cl).toHaveProperty("id");
      expect(typeof cl.id).toBe("string");
      expect(cl).toHaveProperty("name");
      expect(typeof cl.name).toBe("string");
      expect(cl).toHaveProperty("items");
      expect(Array.isArray(cl.items)).toBe(true);
    }
  });

  it("every item has id, label, and checked = false", () => {
    for (const cl of SEED_CHECKLISTS) {
      for (const item of cl.items) {
        expect(item).toHaveProperty("id");
        expect(typeof item.id).toBe("string");
        expect(item).toHaveProperty("label");
        expect(typeof item.label).toBe("string");
        expect(item).toHaveProperty("checked", false);
      }
    }
  });

  it("includes expected checklists", () => {
    const names = SEED_CHECKLISTS.map((c) => c.name);
    expect(names).toContain("出勤");
    expect(names).toContain("お出かけ");
    expect(names).toContain("ジム");
  });

  it("all IDs are unique across checklists", () => {
    const ids = SEED_CHECKLISTS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("item IDs are unique within each checklist", () => {
    for (const cl of SEED_CHECKLISTS) {
      const itemIds = cl.items.map((i) => i.id);
      const unique = new Set(itemIds);
      expect(unique.size).toBe(itemIds.length);
    }
  });
});
