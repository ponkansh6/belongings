import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useDragReorder } from "@/hooks/useDragReorder";
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
      <div data-testid="dragging">{isDragging ? "true" : "false"}</div>
    </div>
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

  it("shows drag visual only after threshold is crossed", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    const handleNode = getByTestId("handle-0").closest('[data-testid^="item-"]')!;
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // isDragging=true from pointerdown (hook tracks drag attempt)
    expect(getByTestId("dragging").textContent).toBe("true");

    // Before threshold: no visual transform yet
    expect(handleNode.style.opacity).toBe("");

    // Just below threshold: 5px move from 10
    fireEvent(document, pointerEvent("pointermove", { clientY: 5 }));
    expect(handleNode.style.opacity).toBe("");
    expect(handleNode.style.transform).toBe("");

    // Cross threshold: 16px total (new DRAG_THRESHOLD=15)
    fireEvent(document, pointerEvent("pointermove", { clientY: -6 }));
    expect(handleNode.style.transform).toContain("translateY");
  });

  it("calls onReorder when an item is dragged to a new position", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Move down past threshold (items at y=0,40,80; midpoint of item 1 at y=60)
    // Use clientY=50 -> index 1, dy=40 > 8 -> activates drag
    fireEvent(document, pointerEvent("pointermove", { clientY: 50 }));
    fireEvent(document, pointerEvent("pointerup"));

    // Item 0 moved to position 1 (below the midpoint of item 1 at y=50 < 60)
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it("does not call onReorder when item returns to original position", () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<TestList count={3} onReorder={onReorder} />);

    const handle = getByTestId("handle-0");
    fireEvent(handle, pointerEvent("pointerdown", { clientY: 10, button: 0 }));

    // Move past threshold
    fireEvent(document, pointerEvent("pointermove", { clientY: 50 }));
    // Return to original position area
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
    fireEvent(document, pointerEvent("pointermove", { clientY: 60 }));

    // pointercancel should end without calling onReorder
    fireEvent(document, pointerEvent("pointercancel"));

    expect(onReorder).not.toHaveBeenCalled();
  });
});
