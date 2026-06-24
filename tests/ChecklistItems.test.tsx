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
