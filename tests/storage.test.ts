import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockLocalStorage } from "./utils/localstorage-mock";
import { loadChecklists, saveChecklists, createChecklist, createItem } from "@/lib/storage";
import type { Checklist, AppData } from "@/lib/types";

beforeEach(() => {
  mockLocalStorage();
  localStorage.clear();
});

afterEach(() => {
  vi.mocked(localStorage.setItem).mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createChecklist", () => {
  it("returns a checklist with a generated id and the given name", () => {
    const cl = createChecklist("My List");
    expect(cl).toHaveProperty("id");
    expect(cl.id).toBeTypeOf("string");
    expect(cl.name).toBe("My List");
    expect(cl.items).toEqual([]);
  });

  it("generates a unique id each time", () => {
    const a = createChecklist("A");
    const b = createChecklist("B");
    expect(a.id).not.toBe(b.id);
  });

  it("creates checklist and item ids when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", { randomUUID: undefined });

    const checklist = createChecklist("Fallback list");
    const item = createItem("Fallback item");

    expect(checklist).toMatchObject({
      name: "Fallback list",
      items: [],
    });
    expect(checklist.id).toMatch(/^\d+-[a-z0-9]{1,7}$/);
    expect(item).toMatchObject({ label: "Fallback item", checked: false });
    expect(item.id).toMatch(/^\d+-[a-z0-9]{1,7}$/);
  });
});

describe("createItem", () => {
  it("returns an item with generated id, label, and checked=false", () => {
    const item = createItem("スマホ");
    expect(item).toHaveProperty("id");
    expect(item.id).toBeTypeOf("string");
    expect(item.label).toBe("スマホ");
    expect(item.checked).toBe(false);
  });
});

describe("loadChecklists", () => {
  it("returns seed checklists when localStorage is empty", () => {
    const data = loadChecklists();
    expect(data.length).toBeGreaterThanOrEqual(3);
    expect(data[0]).toHaveProperty("items");
    expect(data[0].items[0]).toHaveProperty("checked", false);
  });

  it("returns seed checklists when localStorage has no key", () => {
    const data = loadChecklists();
    expect(data.length).toBe(3);
    expect(data.map((c) => c.name)).toContain("出勤");
  });

  it("loads previously saved data", () => {
    const cl: Checklist = {
      id: "test-1",
      name: "Custom",
      items: [{ id: "i-1", label: "Item", checked: true }],
    };
    saveChecklists([cl]);

    const loaded = loadChecklists();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Custom");
    expect(loaded[0].items[0].checked).toBe(true);
  });

  it("preserves version 0 checklists and persists the current version", () => {
    const checklists: Checklist[] = [
      {
        id: "legacy-1",
        name: "Legacy list",
        items: [{ id: "legacy-item-1", label: "Keep me", checked: true }],
      },
    ];
    localStorage.setItem("belongings-checker", JSON.stringify({ version: 0, checklists }));

    expect(loadChecklists()).toEqual(checklists);
    expect(JSON.parse(localStorage.getItem("belongings-checker")!).version).toBe(1);
    expect(JSON.parse(localStorage.getItem("belongings-checker")!).checklists).toEqual(checklists);
  });

  it("returns seed data when localStorage contains invalid JSON", () => {
    localStorage.setItem("belongings-checker", "{invalid json}");
    const data = loadChecklists();
    expect(data.length).toBe(3);
  });

  it("returns seed data when reading from localStorage throws", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const data = loadChecklists();

    expect(data.map((checklist) => checklist.name)).toContain("出勤");
  });

  it("returns seed data when localStorage value is not valid AppData", () => {
    localStorage.setItem("belongings-checker", JSON.stringify({ foo: "bar" }));
    const data = loadChecklists();
    expect(data.length).toBe(3);
  });
});

describe("saveChecklists", () => {
  it("persists checklists to localStorage as valid JSON", () => {
    const cl: Checklist = {
      id: "x",
      name: "Test",
      items: [{ id: "y", label: "A", checked: true }],
    };
    const result = saveChecklists([cl]);
    expect(result).toBe(true);

    const raw = localStorage.getItem("belongings-checker");
    expect(raw).not.toBeNull();
    const parsed: AppData = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.checklists).toHaveLength(1);
    expect(parsed.checklists[0].name).toBe("Test");
  });

  it("overwrites existing data", () => {
    const cl1: Checklist = {
      id: "a",
      name: "First",
      items: [],
    };
    saveChecklists([cl1]);

    const cl2: Checklist = {
      id: "b",
      name: "Second",
      items: [],
    };
    saveChecklists([cl2]);

    const loaded = loadChecklists();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Second");
  });

  it("returns false when writing to localStorage throws", () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error("storage quota exceeded");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(saveChecklists([])).toBe(false);
  });
});

describe("round-trip", () => {
  it("save -> load returns identical data", () => {
    const original: Checklist[] = [
      {
        id: "rt-1",
        name: "Travel",
        items: [
          { id: "rt-1a", label: "Passport", checked: true },
          { id: "rt-1b", label: "Ticket", checked: false },
        ],
      },
      {
        id: "rt-2",
        name: "Work",
        items: [{ id: "rt-2a", label: "Laptop", checked: false }],
      },
    ];
    saveChecklists(original);
    const loaded = loadChecklists();
    expect(loaded).toEqual(original);
  });
});
