import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChecklists } from "@/hooks/useChecklists";
import { saveChecklists } from "@/lib/storage";
import type { Checklist } from "@/lib/types";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Helper to create a pre-populated state in localStorage
function seedLocalStorage(checklists: Checklist[]) {
  saveChecklists(checklists);
}

function setupHook() {
  return renderHook(() => useChecklists());
}

describe("useChecklists — initial load", () => {
  it("loads seed data when localStorage is empty", () => {
    const { result } = setupHook();
    // The effect runs asynchronously; wait for loaded
    expect(result.current.loaded).toBe(true);
    expect(result.current.checklists.length).toBeGreaterThanOrEqual(3);
    expect(result.current.activeView).toEqual({ type: "all" });
    expect(result.current.selectedChecklist).toBeNull();
  });

  it("loads saved data from localStorage", () => {
    seedLocalStorage([{ id: "saved-1", name: "Saved List", items: [] }]);
    const { result } = setupHook();
    expect(result.current.checklists).toHaveLength(1);
    expect(result.current.checklists[0].name).toBe("Saved List");
  });
});

describe("useChecklists — activeView / selectedChecklist", () => {
  it("returns selectedChecklist when a list is active", () => {
    seedLocalStorage([
      { id: "cl-1", name: "A", items: [{ id: "i-1", label: "Item", checked: false }] },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.setActiveView({ type: "list", checklistId: "cl-1" });
    });

    expect(result.current.activeView).toEqual({ type: "list", checklistId: "cl-1" });
    expect(result.current.selectedChecklist).not.toBeNull();
    expect(result.current.selectedChecklist!.name).toBe("A");
  });

  it("selects a third list and moves it to the front", () => {
    seedLocalStorage([
      { id: "cl-1", name: "A", items: [] },
      { id: "cl-2", name: "B", items: [] },
      { id: "cl-3", name: "C", items: [] },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.selectChecklist("cl-3");
    });

    expect(result.current.activeView).toEqual({ type: "list", checklistId: "cl-3" });
    expect(result.current.selectedChecklist).toMatchObject({ id: "cl-3", name: "C" });
    expect(result.current.checklists.map((checklist) => checklist.id)).toEqual([
      "cl-3",
      "cl-1",
      "cl-2",
    ]);
  });

  it("returns null selectedChecklist for unknown id", () => {
    const { result } = setupHook();
    act(() => {
      result.current.setActiveView({ type: "list", checklistId: "nonexistent" });
    });
    expect(result.current.selectedChecklist).toBeNull();
  });
});

describe("useChecklists — CRUD lists", () => {
  it("addChecklist appends a new list", () => {
    const { result } = setupHook();
    const before = result.current.checklists.length;

    act(() => {
      result.current.addChecklist("New List");
    });

    expect(result.current.checklists).toHaveLength(before + 1);
    expect(result.current.checklists[result.current.checklists.length - 1].name).toBe("New List");
  });

  it("renameChecklist updates the name", () => {
    seedLocalStorage([{ id: "cl-1", name: "Old", items: [] }]);
    const { result } = setupHook();

    act(() => {
      result.current.renameChecklist("cl-1", "Renamed");
    });

    expect(result.current.checklists[0].name).toBe("Renamed");
  });

  it("deleteChecklist removes the list", () => {
    seedLocalStorage([
      { id: "a", name: "A", items: [] },
      { id: "b", name: "B", items: [] },
      { id: "c", name: "C", items: [] },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.deleteChecklist("b");
    });

    expect(result.current.checklists.map((c) => c.id)).not.toContain("b");
    expect(result.current.checklists).toHaveLength(2);
  });

  it("reorderChecklists moves a list", () => {
    seedLocalStorage([
      { id: "x", name: "X", items: [] },
      { id: "y", name: "Y", items: [] },
      { id: "z", name: "Z", items: [] },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.reorderChecklists(0, 2); // X -> after Z
    });

    expect(result.current.checklists.map((c) => c.name)).toEqual(["Y", "Z", "X"]);
  });
});

describe("useChecklists — CRUD items", () => {
  it("addItem appends an item to the specified list", () => {
    seedLocalStorage([{ id: "cl-1", name: "List", items: [] }]);
    const { result } = setupHook();

    act(() => {
      result.current.addItem("cl-1", "New Item");
    });

    const list = result.current.checklists.find((c) => c.id === "cl-1")!;
    expect(list.items).toHaveLength(1);
    expect(list.items[0].label).toBe("New Item");
    expect(list.items[0].checked).toBe(false);
  });

  it("toggleItem flips checked state", () => {
    seedLocalStorage([
      {
        id: "cl-1",
        name: "List",
        items: [{ id: "i-1", label: "Item", checked: false }],
      },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.toggleItem("cl-1", "i-1");
    });

    expect(result.current.checklists.find((c) => c.id === "cl-1")!.items[0].checked).toBe(true);

    act(() => {
      result.current.toggleItem("cl-1", "i-1");
    });

    expect(result.current.checklists.find((c) => c.id === "cl-1")!.items[0].checked).toBe(false);
  });

  it("deleteItem removes an item", () => {
    seedLocalStorage([
      {
        id: "cl-1",
        name: "List",
        items: [
          { id: "i-1", label: "A", checked: false },
          { id: "i-2", label: "B", checked: false },
        ],
      },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.deleteItem("cl-1", "i-1");
    });

    const list = result.current.checklists.find((c) => c.id === "cl-1")!;
    expect(list.items).toHaveLength(1);
    expect(list.items[0].id).toBe("i-2");
  });

  it("reorderItems moves an item within a list", () => {
    seedLocalStorage([
      {
        id: "cl-1",
        name: "List",
        items: [
          { id: "a", label: "A", checked: false },
          { id: "b", label: "B", checked: false },
          { id: "c", label: "C", checked: false },
        ],
      },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.reorderItems("cl-1", 0, 2); // A -> after C
    });

    const list = result.current.checklists.find((c) => c.id === "cl-1")!;
    expect(list.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("reorderItems leaves every other list unchanged", () => {
    const otherChecklist: Checklist = {
      id: "cl-2",
      name: "Other list",
      items: [
        { id: "x", label: "X", checked: true },
        { id: "y", label: "Y", checked: false },
      ],
    };
    seedLocalStorage([
      {
        id: "cl-1",
        name: "Reordered list",
        items: [
          { id: "a", label: "A", checked: false },
          { id: "b", label: "B", checked: true },
          { id: "c", label: "C", checked: false },
        ],
      },
      otherChecklist,
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.reorderItems("cl-1", 0, 2);
    });

    expect(result.current.checklists[0].items.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(result.current.checklists.map((checklist) => checklist.id)).toEqual(["cl-1", "cl-2"]);
    expect(result.current.checklists[1]).toEqual(otherChecklist);
  });

  it("keeps other checklist data unchanged during scoped list and item operations", () => {
    const otherChecklist: Checklist = {
      id: "cl-2",
      name: "Other list",
      items: [{ id: "other-item", label: "Keep me", checked: true }],
    };
    seedLocalStorage([
      {
        id: "cl-1",
        name: "Target list",
        items: [
          { id: "item-a", label: "A", checked: false },
          { id: "item-b", label: "B", checked: true },
        ],
      },
      otherChecklist,
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.renameChecklist("cl-1", "Renamed list");
      result.current.addItem("cl-1", "C");
      result.current.toggleItem("cl-1", "item-a");
      result.current.deleteItem("cl-1", "item-b");
      result.current.resetList("cl-1");
    });

    expect(result.current.checklists[0]).toMatchObject({
      id: "cl-1",
      name: "Renamed list",
      items: [
        { id: "item-a", label: "A", checked: false },
        { label: "C", checked: false },
      ],
    });
    expect(result.current.checklists[1]).toEqual(otherChecklist);
  });
});

describe("useChecklists — reset", () => {
  it("resetList unchecks all items in one list", () => {
    seedLocalStorage([
      {
        id: "cl-1",
        name: "List",
        items: [
          { id: "a", label: "A", checked: true },
          { id: "b", label: "B", checked: true },
        ],
      },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.resetList("cl-1");
    });

    const list = result.current.checklists.find((c) => c.id === "cl-1")!;
    expect(list.items.every((i) => i.checked === false)).toBe(true);
  });

  it("resetAll unchecks all items in all lists", () => {
    seedLocalStorage([
      {
        id: "cl-1",
        name: "A",
        items: [{ id: "a", label: "A1", checked: true }],
      },
      {
        id: "cl-2",
        name: "B",
        items: [{ id: "b", label: "B1", checked: true }],
      },
    ]);
    const { result } = setupHook();

    act(() => {
      result.current.resetAll();
    });

    for (const cl of result.current.checklists) {
      expect(cl.items.every((i) => i.checked === false)).toBe(true);
    }
  });
});

describe("useChecklists — persistence failure", () => {
  it("alerts only after the debounced save fails", () => {
    vi.useFakeTimers();
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);

    const { result } = setupHook();
    act(() => {
      result.current.addChecklist("New list");
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(alert).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(alert).toHaveBeenCalledOnce();
    expect(alert).toHaveBeenCalledWith(
      "データの保存に失敗しました。ストレージの容量を確認してください。",
    );
  });
});
