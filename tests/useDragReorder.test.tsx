import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useDragReorder, LONG_PRESS_DURATION } from "@/hooks/useDragReorder";
import { act } from "react";
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
    expect(handleNode.style.opacity).toBe("");
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

    // Move down (items at y=0,40,80; midpoint of item 1 at y=60)
    // clientY=50 → dy=40 → 1:1 tracking → overIndex=1
    fireEvent(document, pointerEvent("pointermove", { clientY: 50 }));
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
});
