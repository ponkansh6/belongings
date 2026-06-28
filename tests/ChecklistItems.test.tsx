import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ChecklistItems from "@/components/ChecklistItems";
import type { Checklist } from "@/lib/types";

vi.mock("framer-motion", async () => {
  const React = await import("react");

  function MockMotionDiv(props: Record<string, unknown>) {
    const {
      children,
      animate,
      onDragEnd,
      onAnimationComplete,
      onDragStart,
      onDrag,
      drag,
      dragDirectionLock,
      dragConstraints,
      dragElastic,
      dragSnapToOrigin: dragSnapToOriginProp,
      layout,
      layoutId,
      layoutDependency,
      initial,
      exit,
      whileDrag,
      whileHover,
      whileTap,
      whileFocus,
      whileInView: _unused_whileInView,
      transition,
      variants,
      onViewportEnter,
      onViewportLeave,
      viewport,
      ...htmlProps
    } = props;

    const isDraggable = drag !== undefined;
    const dragSnapToOrigin = Boolean(dragSnapToOriginProp);
    const [xPos, setXPos] = React.useState(0);

    const onDragEndRef = React.useRef(onDragEnd);
    onDragEndRef.current = onDragEnd;

    const wrappedOnDragEnd = React.useCallback(
      (event: unknown, info: { offset: { x: number } }) => {
        onDragEndRef.current?.(event, info);
        setXPos(dragSnapToOrigin ? 0 : info.offset.x);
      },
      [dragSnapToOrigin],
    );

    React.useEffect(() => {
      if (isDraggable && onDragEnd !== undefined) {
        if (!globalThis.__dragEndCallbacks) {
          globalThis.__dragEndCallbacks = [];
        }
        globalThis.__dragEndCallbacks.push(wrappedOnDragEnd);
      }
    }, [isDraggable, onDragEnd, wrappedOnDragEnd]);

    return React.createElement("div", {
      ...htmlProps,
      ...(isDraggable
        ? {
            "data-test-drag-snap": String(dragSnapToOrigin),
            "data-test-x": String(xPos),
          }
        : {}),
    }, children as React.ReactNode);
  }

  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const sampleChecklist: Checklist = {
  id: "cl-1",
  name: "Work",
  items: [
    { id: "i-1", label: "Laptop", checked: false },
    { id: "i-2", label: "Phone", checked: true },
    { id: "i-3", label: "Wallet", checked: false },
  ],
};

const emptyChecklist: Checklist = {
  id: "cl-2",
  name: "Travel",
  items: [],
};

function renderItems(overrides?: {
  checklist?: Checklist;
  onToggle?: () => void;
  onAddItem?: () => void;
  onDeleteItem?: () => void;
  onReorderItems?: () => void;
  onReset?: () => void;
}) {
  const props = {
    checklist: overrides?.checklist ?? sampleChecklist,
    onToggle: overrides?.onToggle ?? vi.fn(),
    onAddItem: overrides?.onAddItem ?? vi.fn(),
    onDeleteItem: overrides?.onDeleteItem ?? vi.fn(),
    onReorderItems: overrides?.onReorderItems ?? vi.fn(),
    onReset: overrides?.onReset ?? vi.fn(),
  };
  return { ...render(<ChecklistItems {...props} />), props };
}

beforeEach(() => {
  (globalThis as any).__dragEndCallbacks = [];
});

describe("ChecklistItems", () => {
  it("renders the checklist name", () => {
    renderItems();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("shows completion count", () => {
    renderItems();
    expect(screen.getByText("1/3 完了")).toBeInTheDocument();
  });

  it('shows "すべて完了" when all checked', () => {
    const allChecked: Checklist = {
      id: "cl-3",
      name: "Done",
      items: [
        { id: "a", label: "A", checked: true },
        { id: "b", label: "B", checked: true },
      ],
    };
    renderItems({ checklist: allChecked });
    expect(screen.getByText(/すべて完了/)).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    renderItems({ checklist: emptyChecklist });
    expect(screen.getByText("アイテムがまだありません")).toBeInTheDocument();
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
  });

  it("renders all items", () => {
    renderItems();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
  });

  it("shows reset button only when items exist", () => {
    const { unmount } = renderItems();
    expect(screen.getByText("このリストをリセット")).toBeInTheDocument();
    unmount();

    renderItems({ checklist: emptyChecklist });
    expect(screen.queryByText("このリストをリセット")).not.toBeInTheDocument();
  });

  it("calls onToggle when label text is clicked (expanded hit area)", () => {
    const onToggle = vi.fn();
    renderItems({ onToggle });

    // Click the label text itself, not the checkbox input
    fireEvent.click(screen.getByText("Laptop"));

    expect(onToggle).toHaveBeenCalledWith("i-1");
  });

  it("calls onToggle when checked item's label text is clicked", () => {
    const onToggle = vi.fn();
    renderItems({ onToggle });

    // "Phone" is already checked — clicking its label should still toggle
    fireEvent.click(screen.getByText("Phone"));

    expect(onToggle).toHaveBeenCalledWith("i-2");
  });

  it("calls onAddItem when adding a new item", () => {
    const onAddItem = vi.fn();
    renderItems({ onAddItem });

    const input = screen.getByPlaceholderText("アイテムを追加...");
    fireEvent.change(input, { target: { value: "Keys" } });
    fireEvent.click(screen.getByText("追加"));

    expect(onAddItem).toHaveBeenCalledWith("Keys");
  });

  it("adds item on Enter key", () => {
    const onAddItem = vi.fn();
    renderItems({ onAddItem });

    const input = screen.getByPlaceholderText("アイテムを追加...");
    fireEvent.change(input, { target: { value: "Keys" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddItem).toHaveBeenCalledWith("Keys");
  });

  it("does not add empty item", () => {
    const onAddItem = vi.fn();
    renderItems({ onAddItem });

    const input = screen.getByPlaceholderText("アイテムを追加...");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("追加"));

    expect(onAddItem).not.toHaveBeenCalled();
  });

  it("calls onReset when reset button is clicked", () => {
    const onReset = vi.fn();
    renderItems({ onReset });

    fireEvent.click(screen.getByText("このリストをリセット"));

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("shows checked items with line-through styling", () => {
    renderItems();
    const phoneLabel = screen.getByText("Phone");
    expect(phoneLabel.className).toContain("line-through");
  });

  it("shows the swipe-to-delete '削除' label for each item", () => {
    renderItems();
    const deleteLabels = screen.getAllByText("削除");
    expect(deleteLabels).toHaveLength(3);
  });

  describe("swipe-to-delete snap-back", () => {
    it("preserves swipe-to-delete background label for all items", () => {
      renderItems();
      const deleteLabels = screen.getAllByText("削除");
      expect(deleteLabels).toHaveLength(3);
    });

    it("renders single item list without crashing", () => {
      const singleItem: Checklist = {
        id: "cl-single",
        name: "Single",
        items: [{ id: "s-1", label: "Only One", checked: false }],
      };
      renderItems({ checklist: singleItem });
      expect(screen.getByText("Only One")).toBeInTheDocument();
      expect(screen.getByText("削除")).toBeInTheDocument();
    });

    it("renders long checklist without state issues", () => {
      const longItems = Array.from({ length: 20 }, (_, i) => ({
        id: `long-${i}`,
        label: `Item ${i + 1}`,
        checked: false,
      }));
      const longChecklist: Checklist = {
        id: "cl-long",
        name: "Long",
        items: longItems,
      };
      renderItems({ checklist: longChecklist });
      expect(screen.getAllByText("削除")).toHaveLength(20);
    });

    it("all checked items still show line-through styling", () => {
      renderItems();
      const phoneLabel = screen.getByText("Phone");
      expect(phoneLabel.className).toContain("line-through");
    });

    it("sets dragSnapToOrigin on every swipeable card for snap-back", () => {
      renderItems();
      // The swipeable cards are inner motion.div elements with drag props
      const snapCards = document.querySelectorAll("[data-test-drag-snap]");
      expect(snapCards).toHaveLength(3);
      snapCards.forEach((card) => {
        expect(card.getAttribute("data-test-drag-snap")).toBe("true");
      });
    });

    it("calls onDeleteItem when full swipe passes deletion threshold", () => {
      const onDeleteItem = vi.fn();
      renderItems({ onDeleteItem });

      const [dragEnd] = (globalThis as any).__dragEndCallbacks;
      expect(dragEnd).toBeDefined();
      dragEnd({}, { offset: { x: -200 } });

      expect(onDeleteItem).toHaveBeenCalledWith("i-1");
    });

    it("does not call onDeleteItem on partial swipe, card stays in normal state", () => {
      const onDeleteItem = vi.fn();
      renderItems({ onDeleteItem });

      const [dragEnd] = (globalThis as any).__dragEndCallbacks;
      expect(dragEnd).toBeDefined();
      dragEnd({}, { offset: { x: -50 } });

      expect(onDeleteItem).not.toHaveBeenCalled();
    });

    it("handles mixed swipes: partial then full on same card", () => {
      const onDeleteItem = vi.fn();
      renderItems({ onDeleteItem });

      const [dragEnd] = (globalThis as any).__dragEndCallbacks;
      expect(dragEnd).toBeDefined();

      // Partial swipe — no delete
      dragEnd({}, { offset: { x: -50 } });
      expect(onDeleteItem).not.toHaveBeenCalled();

      // Full swipe — should delete
      dragEnd({}, { offset: { x: -200 } });
      expect(onDeleteItem).toHaveBeenCalledTimes(1);
      expect(onDeleteItem).toHaveBeenCalledWith("i-1");
    });

    it("snaps card back to x=0 after partial swipe (dragSnapToOrigin)", async () => {
      renderItems();

      const callbacks = (globalThis as any).__dragEndCallbacks;
      expect(callbacks).toHaveLength(3);

      // Simulate partial swipe on first card
      await act(async () => {
        callbacks[0]({}, { offset: { x: -50 } });
      });

      // Find the swipeable card (inner motion.div with data-test-x)
      const handles = screen.getAllByLabelText("並び替え");
      const swipeable = handles[0].closest("[data-test-x]");
      expect(swipeable).not.toBeNull();
      expect(swipeable?.getAttribute("data-test-x")).toBe("0");
    });
  });
});
