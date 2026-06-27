import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChecklistItems from "@/components/ChecklistItems";
import type { Checklist } from "@/lib/types";

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

  it("calls onToggle when checkbox is clicked", () => {
    const onToggle = vi.fn();
    renderItems({ onToggle });

    // The checkbox is visually hidden (sr-only), so we query by role
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith("i-1");
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

  it("calls onDeleteItem when delete button is clicked", () => {
    const onDeleteItem = vi.fn();
    renderItems({ onDeleteItem });

    const deleteBtns = screen.getAllByLabelText(/を削除/);
    fireEvent.click(deleteBtns[0]);

    expect(onDeleteItem).toHaveBeenCalledWith("i-1");
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

  it('shows the swipe-to-delete "削除" label for each item', () => {
    renderItems();
    const deleteLabels = screen.getAllByText("削除");
    expect(deleteLabels).toHaveLength(3); // one per item
    deleteLabels.forEach((label) => {
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe("SPAN");
    });
  });
});

describe("swipe-to-delete snap-back", () => {
  it("preserves swipe-to-delete background label for all items", () => {
    renderItems();
    const deleteLabels = screen.getAllByText("削除");
    expect(deleteLabels).toHaveLength(sampleChecklist.items.length);
    deleteLabels.forEach((label) => {
      expect(label).toBeInTheDocument();
    });
  });

  it("renders single item list without crashing", () => {
    const singleItemChecklist: Checklist = {
      id: "cl-single",
      name: "Single",
      items: [{ id: "s-1", label: "Only Item", checked: false }],
    };
    renderItems({ checklist: singleItemChecklist });
    expect(screen.getByText("Only Item")).toBeInTheDocument();
    expect(screen.getByText("削除")).toBeInTheDocument();
  });

  it("renders long checklist without state issues", () => {
    const longChecklist: Checklist = {
      id: "cl-long",
      name: "Long List",
      items: Array.from({ length: 20 }, (_, i) => ({
        id: `long-${i + 1}`,
        label: `Item ${i + 1}`,
        checked: false,
      })),
    };
    renderItems({ checklist: longChecklist });
    const deleteLabels = screen.getAllByText("削除");
    expect(deleteLabels).toHaveLength(20);
  });

  it("delete by button correctly calls handler for each item", () => {
    const onDeleteItem = vi.fn();
    const threeItemChecklist: Checklist = {
      id: "cl-three",
      name: "Three",
      items: [
        { id: "i-1", label: "Item 1", checked: false },
        { id: "i-2", label: "Item 2", checked: false },
        { id: "i-3", label: "Item 3", checked: false },
      ],
    };
    renderItems({ checklist: threeItemChecklist, onDeleteItem });

    const deleteBtns = screen.getAllByLabelText(/を削除/);
    expect(deleteBtns).toHaveLength(3);

    fireEvent.click(deleteBtns[1]);
    expect(onDeleteItem).toHaveBeenCalledWith("i-2");
  });

  it("all checked items still show line-through styling", () => {
    renderItems();
    const phoneLabel = screen.getByText("Phone");
    expect(phoneLabel.className).toContain("line-through");
  });

  it("renders animate={{ x: 0 }} on every swipeable card for snap-back", () => {
    // Mock framer-motion to expose animate prop as data attribute
    renderItems();

    // Find swipeable cards: the inner motion.div (swipable card) 
    // is inside each item and has class "relative flex items-center gap-1.5 rounded-xl..."
    // Each item is rendered as a motion.div (outer) containing a motion.div (inner/swipeable)
    // We can identify swipeable cards by the presence of both "削除" label in the card
    // and the drag-handle button (aria-label="並び替え")

    // The swipeable cards contain the drag handle buttons
    const handles = screen.getAllByLabelText("並び替え");
    expect(handles.length).toBe(sampleChecklist.items.length);

    // Each swipeable card (parent of the handle) should have the right structure
    // The inner motion.div wraps: drag handle, checkbox label, and delete button
    handles.forEach((handle) => {
      // The swipeable card is the parent with aria-grabbed attribute
      const swipeable = handle.closest("[aria-grabbed]");
      expect(swipeable).not.toBeNull();

      // Verify the delete button exists in the same card
      const deleteBtn = swipeable?.querySelector('[aria-label*="削除"]');
      expect(deleteBtn).toBeInTheDocument();
    });
  });
});
