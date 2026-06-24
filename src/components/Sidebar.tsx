"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Checklist } from "@/lib/types";
import type { ActiveView } from "@/hooks/useChecklists";
import { useDragReorder } from "@/hooks/useDragReorder";

interface SidebarProps {
  checklists: Checklist[];
  activeView: ActiveView;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function Sidebar({
  checklists,
  activeView,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: SidebarProps) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    containerRef,
    handlePointerDown,
    getItemStyle,
    isDragging,
  } = useDragReorder(onReorder);

  useEffect(() => {
    if (showNewInput) newInputRef.current?.focus();
  }, [showNewInput]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const handleNewSubmit = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewName("");
      setShowNewInput(false);
    }
  }, [newName, onAdd]);

  const handleEditSubmit = useCallback(
    (id: string) => {
      const trimmed = editingName.trim();
      if (trimmed) {
        onRename(id, trimmed);
      }
      setEditingId(null);
    },
    [editingName, onRename]
  );

  const handleDelete = useCallback(
    (name: string, id: string) => {
      if (window.confirm(`「${name}」を削除しますか？`)) {
        onDelete(id);
      }
    },
    [onDelete]
  );

  const handleCancelNew = useCallback(() => {
    setShowNewInput(false);
    setNewName("");
  }, []);

  const totalItems = checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const checkedItems = checklists.reduce(
    (acc, cl) => acc + cl.items.filter((i) => i.checked).length,
    0
  );

  return (
    <aside className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          チェックリスト
        </h2>
        {checklists.length > 0 && (
          <span className="text-[11px] tabular-nums text-stone-400" aria-live="polite">
            {checkedItems}/{totalItems}
          </span>
        )}
      </div>

      {/* Empty state - no checklists */}
      {checklists.length === 0 && !showNewInput ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-400"
            >
              <path d="M9 1v16M1 9h16" />
            </svg>
          </div>
          <p className="mb-3 text-sm font-medium text-stone-500">
            チェックリストがありません
          </p>
          <button
            type="button"
            onClick={() => setShowNewInput(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 active:bg-blue-700"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
            最初のリストを作成
          </button>
        </div>
      ) : (
        <>
          {/* Checklist list */}
          {checklists.length > 0 ? (
            <div ref={containerRef} className="flex flex-col gap-0.5">
              {checklists.map((cl, index) => {
                const isActive =
                  activeView.type === "list" &&
                  activeView.checklistId === cl.id;
                const isEditing = editingId === cl.id;
                const itemStyle = getItemStyle(index);
                const checkedCount = cl.items.filter((i) => i.checked).length;

                return (
                  <div
                    key={cl.id}
                    style={itemStyle}
                    aria-grabbed={isDragging}
                    className={`group flex items-center gap-0.5 rounded-xl px-1 transition-colors ${
                      isActive
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : "hover:bg-stone-100"
                    }`}
                  >
                    {/* Drag handle */}
                    <button
                      type="button"
                      onPointerDown={(e) => handlePointerDown(index, e)}
                      className="flex h-10 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-stone-400 transition-colors hover:text-stone-600 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label="並び替え"
                      tabIndex={0}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <line x1="4" y1="3.5" x2="10" y2="3.5" />
                        <line x1="4" y1="7" x2="10" y2="7" />
                        <line x1="4" y1="10.5" x2="10" y2="10.5" />
                      </svg>
                    </button>

                    {/* Name / Edit input */}
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSubmit(cl.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => handleEditSubmit(cl.id)}
                        className="h-8 flex-1 rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        aria-label="リスト名を編集"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(cl.id)}
                        className="flex h-10 min-w-0 flex-1 items-center gap-2 truncate px-1.5 text-left text-sm font-medium text-stone-700 transition-colors hover:text-stone-900"
                      >
                        <span className="truncate">{cl.name}</span>
                        {cl.items.length > 0 && (
                          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-stone-400">
                            {checkedCount}/{cl.items.length}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cl.id);
                            setEditingName(cl.name);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          aria-label="名前を変更"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 13 13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9.5 1.5L11.5 3.5L4.5 10.5L1.5 11.5L2.5 8.5L9.5 1.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cl.name, cl.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-red-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          aria-label="削除"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 13 13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          >
                            <line x1="2.5" y1="2.5" x2="10.5" y2="10.5" />
                            <line x1="10.5" y1="2.5" x2="2.5" y2="10.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}

      {/* New checklist input / button */}
      {showNewInput ? (
        <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-sm">
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNewSubmit();
              if (e.key === "Escape") handleCancelNew();
            }}
            onBlur={() => {
              if (!newName.trim()) handleCancelNew();
            }}
            placeholder="リスト名を入力..."
            className="h-8 flex-1 text-sm outline-none placeholder:text-stone-400"
            aria-label="新しいリスト名"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleCancelNew}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleNewSubmit}
              disabled={!newName.trim()}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-500"
            >
              作成
            </button>
          </div>
        </div>
      ) : checklists.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowNewInput(true)}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="7" y1="2" x2="7" y2="12" />
            <line x1="2" y1="7" x2="12" y2="7" />
          </svg>
          新規リスト
        </button>
      ) : null}
    </aside>
  );
}
