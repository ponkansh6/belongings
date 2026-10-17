import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import type { Checklist } from "@/lib/types";
import type { ActiveView } from "@/hooks/useChecklists";

const mockLists: Checklist[] = [
  {
    id: "cl-1",
    name: "Work",
    items: [
      { id: "i-1", label: "Laptop", checked: true },
      { id: "i-2", label: "Phone", checked: false },
    ],
  },
  {
    id: "cl-2",
    name: "Travel",
    items: [],
  },
];

function renderSidebar(overrides?: {
  checklists?: Checklist[];
  activeView?: ActiveView;
  onSelect?: () => void;
  onAdd?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onReorder?: () => void;
}) {
  const props = {
    checklists: overrides?.checklists ?? mockLists,
    activeView: overrides?.activeView ?? { type: "all" },
    onSelect: overrides?.onSelect ?? vi.fn(),
    onAdd: overrides?.onAdd ?? vi.fn(),
    onRename: overrides?.onRename ?? vi.fn(),
    onDelete: overrides?.onDelete ?? vi.fn(),
    onReorder: overrides?.onReorder ?? vi.fn(),
  };
  return { ...render(<Sidebar {...props} />), props };
}

describe("Sidebar", () => {
  beforeEach(() => {
    // Restore confirm if mocked
    vi.restoreAllMocks();
  });

  describe("empty state", () => {
    it('shows "最初のリストを作成" button when no checklists', () => {
      renderSidebar({ checklists: [] });
      expect(screen.getByText("最初のリストを作成")).toBeInTheDocument();
      expect(screen.getByText("チェックリストがありません")).toBeInTheDocument();
    });

    it("triggers new list creation from empty state", () => {
      const onAdd = vi.fn();
      renderSidebar({ checklists: [], onAdd });

      // Click the "最初のリストを作成" button
      fireEvent.click(screen.getByText("最初のリストを作成"));
      expect(screen.getByPlaceholderText("リスト名を入力...")).toBeInTheDocument();
    });
  });

  describe("with checklists", () => {
    it("renders all checklist names", () => {
      renderSidebar();
      expect(screen.getByText("Work")).toBeInTheDocument();
      expect(screen.getByText("Travel")).toBeInTheDocument();
    });

    it("highlights the active list", () => {
      renderSidebar({ activeView: { type: "list", checklistId: "cl-1" } });
      const workBtn = screen.getByText("Work").closest("button")!;
      expect(workBtn.className).toContain("font-medium");
    });

    it("calls onSelect when a list is clicked", () => {
      const onSelect = vi.fn();
      renderSidebar({ onSelect });
      fireEvent.click(screen.getByText("Work"));
      expect(onSelect).toHaveBeenCalledWith("cl-1");
    });

    it("shows new list input when clicking 新規リスト", () => {
      renderSidebar();
      fireEvent.click(screen.getByText("新規リスト"));
      expect(screen.getByPlaceholderText("リスト名を入力...")).toBeInTheDocument();
    });

    it("calls onAdd when new list is submitted", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      const input = screen.getByPlaceholderText("リスト名を入力...");
      fireEvent.change(input, { target: { value: "My New List" } });
      fireEvent.click(screen.getByText("作成"));

      expect(onAdd).toHaveBeenCalledWith("My New List");
    });

    it("trims whitespace from a new list name", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      fireEvent.change(screen.getByPlaceholderText("リスト名を入力..."), {
        target: { value: "  My List  " },
      });
      fireEvent.click(screen.getByText("作成"));

      expect(onAdd).toHaveBeenCalledWith("My List");
    });

    it("creates a list when Enter is pressed", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      const input = screen.getByPlaceholderText("リスト名を入力...");
      fireEvent.change(input, { target: { value: "Packing" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onAdd).toHaveBeenCalledWith("Packing");
      expect(screen.queryByPlaceholderText("リスト名を入力...")).not.toBeInTheDocument();
    });

    it("does not create an empty list when Enter is pressed", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      const input = screen.getByPlaceholderText("リスト名を入力...");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onAdd).not.toHaveBeenCalled();
      expect(input).toBeInTheDocument();
    });

    it("discards a new list draft when Escape is pressed", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      const input = screen.getByPlaceholderText("リスト名を入力...");
      fireEvent.change(input, { target: { value: "Unfinished" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onAdd).not.toHaveBeenCalled();
      expect(screen.queryByPlaceholderText("リスト名を入力...")).not.toBeInTheDocument();
    });

    it("closes the empty new list form on blur without adding a list", () => {
      const onAdd = vi.fn();
      renderSidebar({ onAdd });

      fireEvent.click(screen.getByText("新規リスト"));
      fireEvent.blur(screen.getByPlaceholderText("リスト名を入力..."));

      expect(screen.queryByPlaceholderText("リスト名を入力...")).not.toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("cancels new list creation", () => {
      renderSidebar();
      fireEvent.click(screen.getByText("新規リスト"));
      fireEvent.click(screen.getByText("キャンセル"));
      expect(screen.queryByPlaceholderText("リスト名を入力...")).not.toBeInTheDocument();
    });
  });

  describe("rename", () => {
    it("allows renaming a list", () => {
      const onRename = vi.fn();
      renderSidebar({ onRename });

      // Click the rename button (pencil icon) for "Work"
      const renameBtns = screen.getAllByLabelText("名前を変更");
      fireEvent.click(renameBtns[0]);

      const input = screen.getByLabelText("リスト名を編集");
      fireEvent.change(input, { target: { value: "Office" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onRename).toHaveBeenCalledWith("cl-1", "Office");
    });

    it("notifies the parent of a nonempty rename when the input loses focus", () => {
      const onRename = vi.fn();
      renderSidebar({ onRename });

      fireEvent.click(screen.getAllByLabelText("名前を変更")[0]);
      const input = screen.getByLabelText("リスト名を編集");
      fireEvent.change(input, { target: { value: "Office" } });
      fireEvent.blur(input);

      expect(onRename).toHaveBeenCalledWith("cl-1", "Office");
    });

    it("cancels rename on Escape", () => {
      const onRename = vi.fn();
      renderSidebar({ onRename });

      const renameBtns = screen.getAllByLabelText("名前を変更");
      fireEvent.click(renameBtns[0]);

      const input = screen.getByLabelText("リスト名を編集");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onRename).not.toHaveBeenCalled();
    });

    it("trims whitespace from the renamed list name", () => {
      const onRename = vi.fn();
      renderSidebar({ onRename });

      fireEvent.click(screen.getAllByLabelText("名前を変更")[0]);
      const input = screen.getByLabelText("リスト名を編集");
      fireEvent.change(input, { target: { value: "  Office  " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onRename).toHaveBeenCalledWith("cl-1", "Office");
    });

    it("keeps the existing name when an empty rename is submitted", () => {
      const onRename = vi.fn();
      renderSidebar({ onRename });

      fireEvent.click(screen.getAllByLabelText("名前を変更")[0]);
      const input = screen.getByLabelText("リスト名を編集");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onRename).not.toHaveBeenCalled();
      expect(screen.getByText("Work")).toBeInTheDocument();
    });
  });

  describe("delete", () => {
    it("calls onDelete after confirm", () => {
      const onDelete = vi.fn();
      window.confirm = vi.fn(() => true);
      renderSidebar({ onDelete });

      const deleteBtns = screen.getAllByLabelText("削除");
      fireEvent.click(deleteBtns[0]);

      expect(window.confirm).toHaveBeenCalledWith("「Work」を削除しますか？");
      expect(onDelete).toHaveBeenCalledWith("cl-1");
    });

    it("does not call onDelete when confirm is cancelled", () => {
      const onDelete = vi.fn();
      window.confirm = vi.fn(() => false);
      renderSidebar({ onDelete });

      const deleteBtns = screen.getAllByLabelText("削除");
      fireEvent.click(deleteBtns[0]);

      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
