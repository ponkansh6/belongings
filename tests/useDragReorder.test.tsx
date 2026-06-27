import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useState, act } from "react";
import { useDragReorder, LONG_PRESS_DURATION } from "@/hooks/useDragReorder";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * A minimal test component that exercises useDragReorder.
 * Renders a list of items that can be dragged to reorder.
 */
function TestList({
  count,
  onReorder,
}: {
  count: number;
  onReorder: (from: number, to: number) => void;
}) {
  const { containerRef, handlePointerDown, getItemStyle, isDragging } =
    useDragReorder(onReorder);

  return (
    <>
      <div ref={containerRef} data-testid="container">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            data-testid={`item-${i}`}
            style={getItemStyle(i)}
            className="item"
          >
            <button
              type="button"
              data-testid={`handle-${i}`}
              onPointerDown={(e) => handlePointerDown(i, e)}
            >
              ≡
            </button>
            <span>Item {i}</span>
          </div>
        ))}
      </div>
      <div data-testid="dragging">{isDragging ? "true" : "false"}</div>
    </>
  );
}

/**
 * A test component that managers items with parent state (useState),
 * simulating the real app's reorder → setChecklists → re-render flow.
 */
function ReorderableList({ count }: { count: number }) {
  const [items, setItems] = useState(
    Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` })),
  );

  const { containerRef, handlePointerDown, getItemStyle, isDragging, dragState } =
    useDragReorder((from, to) => {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    });

  return (
    <>
      <div ref={containerRef} data-testid="container">
        {items.map((item, i) => (
          <div
            key={item.id}
            data-testid={`item-${i}`}
            style={getItemStyle(i)}
            className="item"
          >
            <button
              type="button"
              data-testid={`handle-${i}`}
              onPointerDown={(e) => handlePointerDown(i, e)}
            >
              ≡
            </button>
            <span>{item.label}</span>
          </div>
        ))}
        {dragState?.overIndex === items.length && (
          <div data-testid="bottom-indicator" data-drop-indicator className="h-0.5" />
        )}
      </div>
      <div data-testid="dragging">{isDragging ? "true" : "false"}</div>
    </>
  );
}

/** Create a synthetic PointerEvent with minimal required fields */
function pointerEvent(
  type: string,
  overrides?: Partial<PointerEvent>
): PointerEvent {
  return new PointerEvent(type, {
    clientX: 0,
    clientY: 0,
    bubbles: true,
    cancelable: true,
    ...overrides,
  });
}

/** Get bounding client rect for a simulated element at a given vertical position.
 *  Each item is 40px tall. */
function rectForItem(index: number, itemHeight = 40): DOMRect {
  return {
    top: index * itemHeight,
    bottom: (index + 1) * itemHeight,
    left: 0,
    right: 200,
    width: 200,
    height: itemHeight,
    x: 0,
    y: index * itemHeight,
    toJSON: () => "",
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Stub getBoundingClientRect on all elements
  Element.prototype.getBoundingClientRect = function () {
    const testId = this.getAttribute?.("data-testid") ?? "";
    const match = testId.match(/^item-(\d+)$/);
    if (match) {
      return rectForItem(parseInt(match[1]));
    }
    return rectForItem(0);
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDragReorder", () => {
  it("does not reorder when drag ends without moving", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // No movement — fire pointerup without pointermove
    fireEvent(document, pointerEvent("pointerup"));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("shows drag visual only after long-press duration", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    const handleNode = handle.closest('[data-testid^="item-"]')!;
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // isDragging = true from pointerdown
    expect(getByTestId("dragging").textContent).toBe("true");

    // Before timer fires: no visual transform
    expect(handleNode.style.opacity).toBe("1");
    expect(handleNode.style.transform).toBe("");

    // Fire the long-press timer
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_DURATION);
    });

    // Now active: opacity should be set even before any move
    expect(handleNode.style.opacity).toBe("0.3");

    // Dragged item does NOT track pointer (no translateY)
    fireEvent(document, pointerEvent("pointermove", { clientY: 30 }));
    expect(handleNode.style.transform).toBe("");

    // Target item shows drop indicator (borderTop)
    // Items are at y=0,40,80 with height=40.
    // clientY=30 → midpoint of item 0 (20) < 30 < midpoint of item 1 (60) → overIndex=1
    const targetNode = getByTestId("item-1");
    expect(targetNode.style.borderTop).toBe("2px solid #3b82f6");
  });

  it("calls onReorder when an item is long-pressed and dragged", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Wait for long-press to activate
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_DURATION);
    });

    // Move down (items at y=0,40,80; midpoints at 20,60,100)
    // clientY=70 → overIndex=2 (top half of item 2) → toIndex=1
    fireEvent(document, pointerEvent("pointermove", { clientY: 70 }));
    fireEvent(document, pointerEvent("pointerup"));

    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it("does not call onReorder when item returns to original position after long-press", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Wait for long-press
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_DURATION);
    });

    // Move down
    fireEvent(document, pointerEvent("pointermove", { clientY: 50 }));
    // Return to original position
    fireEvent(document, pointerEvent("pointermove", { clientY: 10 }));
    fireEvent(document, pointerEvent("pointerup"));

    // fromIndex === overIndex (both 0) => no reorder
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("cancels on Escape key", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Wait for long-press to activate
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_DURATION);
    });

    // Move past threshold
    fireEvent(document, pointerEvent("pointermove", { clientY: 60 }));

    // Escape cancels
    fireEvent(document, new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ignores non-left-button pointer down", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    // Right click (button = 2)
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 2 }));
    fireEvent(document, pointerEvent("pointermove", { clientY: 60 }));
    fireEvent(document, pointerEvent("pointerup"));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("handles pointercancel gracefully", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Wait for long-press to activate
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_DURATION);
    });

    fireEvent(document, pointerEvent("pointermove", { clientY: 60 }));

    // pointercancel should end without calling onReorder
    fireEvent(document, pointerEvent("pointercancel"));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("restores full opacity when drag returns to original position and ends", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    const item0 = handle.closest('[data-testid^="item-"]')!;

    // Long-press handle-0
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });

    // Move to overIndex=1
    fireEvent(document, pointerEvent("pointermove", { clientY: 50 }));

    // Return to original position (overIndex=0, fromIndex=0)
    fireEvent(document, pointerEvent("pointermove", { clientY: 10 }));

    // End drag
    fireEvent(document, pointerEvent("pointerup"));

    // After flush, opacity should be restored to normal
    expect(item0.style.opacity).not.toBe("0.3");
    expect(item0.style.opacity).toBe("1");
  });

  it("restores full opacity after a reorder completes", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    const item0 = handle.closest('[data-testid^="item-"]')!;

    // Long-press and drag
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });
    // clientY=70 → overIndex=2 (top half of item 2) → toIndex=1
    fireEvent(document, pointerEvent("pointermove", { clientY: 70 }));

    // End drag (triggers onReorder)
    fireEvent(document, pointerEvent("pointerup"));

    // After reorder, opacity should be restored
    expect(item0.style.opacity).not.toBe("0.3");
    expect(item0.style.opacity).toBe("1");
  });

  it("shows bottom indicator when dragging below the last item", () => {
    const { getByTestId } = render(<ReorderableList count={4} />);

    // Drag item 0 to bottom (overIndex=4, beyond last item)
    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });

    // Move to below last item's midpoint
    // 4 items at y=0,40,80,120 with height=40; midpoints at 20,60,100,140
    // clientY=150 → below all midpoints → getIndexFromY returns 4 (items.length)
    fireEvent(document, pointerEvent("pointermove", { clientY: 150 }));

    // Bottom indicator element should appear (no item gets borderTop)
    expect(getByTestId("bottom-indicator")).toBeInTheDocument();
  });

  it("restores full opacity after reorder triggers parent state update", () => {
    const { getByTestId } = render(<ReorderableList count={3} />);

    // Get the handle for item-0
    const handle = getByTestId("handle-0");
    const item0 = handle.closest('[data-testid^="item-"]') as HTMLElement;

    // Long-press and drag item-0 to position 1
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });
    // clientY=70 → overIndex=2 (top half of item 2) → toIndex=1
    fireEvent(document, pointerEvent("pointermove", { clientY: 70 }));

    // End drag → triggers onReorder → setItems updates state → re-render
    fireEvent(document, pointerEvent("pointerup"));

    // After parent re-render, opacity should be restored
    expect(item0.style.opacity).not.toBe("0.3");
    expect(item0.style.opacity).toBe("1");
  });

  it("places item at correct position when dragging downward (fromIndex < overIndex)", () => {
    const { getByTestId } = render(<ReorderableList count={4} />);

    // Initial order: [Item 0, Item 1, Item 2, Item 3]
    const handle = getByTestId("handle-0");

    // Long-press and drag item-0 down
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });

    // Move pointer to top half of item 3
    // Items at y=0,40,80,120 with height 40; midpoints at 20,60,100,140
    // clientY=110 → top half of item 3 → getIndexFromY returns 3 → overIndex=3
    // Visual indicator: borderTop on item at index 3 (Item 3)
    // → suggests "insert before Item 3" → between Item 2 and Item 3
    fireEvent(document, pointerEvent("pointermove", { clientY: 110 }));

    // End drag
    fireEvent(document, pointerEvent("pointerup"));

    // Verify the resulting order matches the visual indicator:
    // Expected: [Item 1, Item 2, Item 0, Item 3]
    // Old bug:  [Item 1, Item 2, Item 3, Item 0] (off by one — item 0 after item 3)
    expect(getByTestId("item-0").textContent).toContain("Item 1");
    expect(getByTestId("item-1").textContent).toContain("Item 2");
    expect(getByTestId("item-2").textContent).toContain("Item 0");
    expect(getByTestId("item-3").textContent).toContain("Item 3");
  });

  it("places item at correct position when dragging upward (overIndex < fromIndex)", () => {
    const { getByTestId } = render(<ReorderableList count={4} />);

    // Initial order: [Item 0, Item 1, Item 2, Item 3]
    const handle = getByTestId("handle-3");

    // Long-press and drag item-3 up
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 130, button: 0 }));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_DURATION); });

    // Move pointer to bottom half of item 0
    // Items at y=0,40,80,120 with height 40; midpoints at 20,60,100,140
    // clientY=30 → bottom half of item 0 (midpoint=20 < 30 < 40) → getIndexFromY returns 1
    // Visual indicator: borderTop on item at index 1 (Item 1)
    // → suggests "insert before Item 1" → between Item 0 and Item 1
    fireEvent(document, pointerEvent("pointermove", { clientY: 30 }));

    // End drag
    fireEvent(document, pointerEvent("pointerup"));

    // Verify the resulting order matches the visual indicator:
    // Expected: [Item 0, Item 3, Item 1, Item 2]
    expect(getByTestId("item-0").textContent).toContain("Item 0");
    expect(getByTestId("item-1").textContent).toContain("Item 3");
    expect(getByTestId("item-2").textContent).toContain("Item 1");
    expect(getByTestId("item-3").textContent).toContain("Item 2");
  });
});
