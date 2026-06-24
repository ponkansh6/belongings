"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Checklist } from "@/lib/types";
import { useDragReorder } from "@/hooks/useDragReorder";

interface ChecklistItemsProps {
  checklist: Checklist;
  onToggle: (itemId: string) => void;
  onAddItem: (label: string) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItems: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export default function ChecklistItems({
  checklist,
  onToggle,
  onAddItem,
  onDeleteItem,
  onReorderItems,
  onReset,
}: ChecklistItemsProps) {
  const [newItemLabel, setNewItemLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { containerRef, handlePointerDown, getItemStyle, isDragging } =
    useDragReorder(onReorderItems);

  // Focus input when switching lists
  useEffect(() => {
    inputRef.current?.focus();
  }, [checklist.id]);

  const handleAddSubmit = useCallback(() => {
    const trimmed = newItemLabel.trim();
    if (trimmed) {
      onAddItem(trimmed);
      setNewItemLabel("");
      // Re-focus the input for adding more items
      inputRef.current?.focus();
    }
  }, [newItemLabel, onAddItem]);

  const checkedCount = checklist.items.filter((i) => i.checked).length;
  const allChecked = checklist.items.length > 0 && checkedCount === checklist.items.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header area */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-stone-800">{checklist.name}</h2>
          {checklist.items.length > 0 && (
            <p className="text-xs text-stone-400" aria-live="polite">
              {checkedCount}/{checklist.items.length} 完了
              {allChecked && " ✓ すべて完了"}
            </p>
          )}
        </div>
        {checklist.items.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 active:bg-stone-100"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 6C1 3 3 1 6 1C9 1 11 3 11 6C11 9 9 11 6 11C4 11 2.5 10 1.5 8.5" />
              <polyline points="3.5 6 1 6 1 3.5" />
            </svg>
            このリストをリセット
          </button>
        )}
      </div>

      {/* Empty state */}
      {checklist.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 p-8 text-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-stone-300"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p className="text-sm font-medium text-stone-500">アイテムがまだありません</p>
          <p className="text-xs text-stone-400">以下の入力欄から追加してください</p>
        </div>
      ) : (
        <>
          {/* Items list */}
          <div ref={containerRef} className="-mx-1 flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {checklist.items.map((item, index) => {
                const itemStyle = getItemStyle(index);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: -120,
                      height: 0,
                      marginBottom: 0,
                      overflow: "hidden",
                      transition: { duration: 0.25, ease: "easeInOut" },
                    }}
                    style={itemStyle}
                    className="relative overflow-hidden rounded-xl"
                  >
                    {/* Red delete background revealed when swiping left */}
                    <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end rounded-xl bg-red-500 pr-5">
                      <span className="text-sm font-medium text-white">削除</span>
                    </div>

                    {/* Swipable card */}
                    <motion.div
                      drag="x"
                      dragDirectionLock
                      dragConstraints={{ left: -200, right: 0 }}
                      dragElastic={{ left: 0.3, right: 0 }}
                      onDragEnd={(_event, info) => {
                        if (info.offset.x < -100) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className={`relative flex items-center gap-1.5 rounded-xl px-1 transition-colors ${
                        item.checked
                          ? "bg-stone-50/80"
                          : "bg-white hover:bg-stone-50"
                      }`}
                      aria-grabbed={isDragging}
                    >
                      {/* Drag handle */}
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.nativeEvent.stopPropagation();
                          handlePointerDown(index, e);
                        }}
                        className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-stone-300 transition-colors hover:text-stone-500 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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

                      {/* Custom checkbox */}
                      <label className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-stone-300 transition-colors has-checked:border-blue-500 has-checked:bg-blue-500">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => onToggle(item.id)}
                          className="peer sr-only"
                        />
                        {item.checked && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-none"
                          >
                            <polyline points="2.5 6 5 8.5 9.5 3.5" />
                          </svg>
                        )}
                      </label>

                      {/* Label */}
                      <span
                        className={`min-w-0 flex-1 truncate py-2.5 pr-1 text-sm transition-colors ${
                          item.checked
                            ? "text-stone-400 line-through"
                            : "text-stone-700"
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Delete button — desktop/keyboard fallback */}
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`「${item.label}」を削除`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <line x1="2" y1="2" x2="10" y2="10" />
                          <line x1="10" y1="2" x2="2" y2="10" />
                        </svg>
                      </button>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="h-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(checkedCount / checklist.items.length) * 100}%`,
              }}
            />
          </div>
        </>
      )}

      {/* Add item input */}
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 shadow-sm transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="shrink-0 text-stone-400"
        >
          <line x1="8" y1="3" x2="8" y2="13" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddSubmit();
          }}
          placeholder="アイテムを追加..."
          className="h-10 flex-1 text-sm outline-none placeholder:text-stone-400"
          aria-label="新しいアイテム"
        />
        <button
          type="button"
          onClick={handleAddSubmit}
          disabled={!newItemLabel.trim()}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:text-stone-300 disabled:hover:bg-transparent"
        >
          追加
        </button>
      </div>
    </div>
  );
}
