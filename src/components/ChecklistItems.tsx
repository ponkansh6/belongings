"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Checklist } from "@/lib/types";
import { useDragReorder } from "@/hooks/useDragReorder";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const isEmpty = checklist.items.length === 0;

  const { containerRef, handlePointerDown, getItemStyle, dragState } =
    useDragReorder(onReorderItems);

  // 自動フォーカスは以下の2ケースに限定:
  //   ケース1: リスト内のアイテムが0件のとき
  //   ケース2: アイテム追加直後（連続追加用）
  // それ以外（アイテムが存在するリストの選択、チェック/解除、リセット等）ではフォーカスしない

  // ケース1: リストが空のときだけinputにフォーカス
  // 発火条件: 別リストに切り替えた、またはアイテムが0件になった（最後の1件削除など）
  useEffect(() => {
    if (isEmpty) {
      inputRef.current?.focus();
    }
  }, [checklist.id, isEmpty]);

  const handleAddSubmit = useCallback(() => {
    const trimmed = newItemLabel.trim();
    if (trimmed) {
      onAddItem(trimmed);
      setNewItemLabel("");
      // ケース2: アイテム追加直後にリフォーカス（連続追加用）
      inputRef.current?.focus();
    }
  }, [newItemLabel, onAddItem]);

  const checkedCount = checklist.items.filter((i) => i.checked).length;
  const allChecked = checklist.items.length > 0 && checkedCount === checklist.items.length;

  const [showCelebration, setShowCelebration] = useState(false);
  const prevAllCheckedRef = useRef(allChecked);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Detect 100% completion and show celebration briefly
  useEffect(() => {
    if (allChecked && !prevAllCheckedRef.current) {
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(t);
    }
    prevAllCheckedRef.current = allChecked;
  }, [allChecked]);

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
                    data-testid="checklist-item"
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
                    {/* Swipe-to-delete red background */}
                    <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end rounded-xl bg-red-500 pr-5">
                      <span className="text-sm font-medium text-white">削除</span>
                    </div>

                    <motion.div
                      className={`relative flex items-center gap-1.5 rounded-xl px-1 transition-colors ${
                        item.checked ? "bg-stone-100" : "bg-white hover:bg-stone-50"
                      }`}
                      drag="x"
                      dragDirectionLock
                      dragConstraints={{ left: -250, right: 0 }}
                      dragElastic={{ left: 0.05, right: 0 }}
                      dragSnapToOrigin
                      onDragEnd={(_event, info) => {
                        if (info.offset.x < -180) {
                          onDeleteItem(item.id);
                        }
                      }}
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

                      {/* Custom checkbox — 行全体がクリック可能 */}
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-2.5 pr-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-stone-300 transition-colors has-checked:border-blue-500 has-checked:bg-blue-500">
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
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm transition-colors ${
                            item.checked ? "text-stone-400 line-through" : "text-stone-700"
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Bottom drop indicator when dragging below the last item */}
            {dragState?.overIndex === checklist.items.length && (
              <div data-drop-indicator className="h-0.5 rounded-full bg-blue-400 -mx-0.5" />
            )}
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

          {/* 100% celebration overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={false}
                animate={{
                  opacity: 1,
                  scale: prefersReducedMotion ? 1 : [0.9, 1.02, 1],
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.45,
                  ease: "easeOut",
                  scale: { type: "spring", stiffness: 260, damping: 20 },
                }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm"
                role="status"
                aria-live="polite"
                onClick={() => setShowCelebration(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
                  className="text-center"
                >
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-3"
                  >
                    <circle cx="36" cy="36" r="32" />
                    <polyline points="20 36 32 48 52 24" />
                  </svg>
                  <p className="text-2xl font-semibold text-stone-800">行ってらっしゃい！</p>
                  <p className="mt-1 text-sm text-stone-500">準備完了。よい旅を。</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
