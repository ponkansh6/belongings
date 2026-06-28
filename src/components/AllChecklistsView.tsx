"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Checklist } from "@/lib/types";

interface AllChecklistsViewProps {
  checklists: Checklist[];
  onToggle: (checklistId: string, itemId: string) => void;
  onAddItem: (checklistId: string, label: string) => void;
  onDeleteItem: (checklistId: string, itemId: string) => void;
  onReset: (checklistId: string) => void;
}

export default function AllChecklistsView({
  checklists,
  onToggle,
  onAddItem,
  onDeleteItem,
  onReset,
}: AllChecklistsViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("belongings-all-collapsed");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem("belongings-all-collapsed", JSON.stringify([...collapsedIds]));
  }, [collapsedIds]);

  const [newItemLabels, setNewItemLabels] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSubmit = useCallback((checklistId: string) => {
    const label = (newItemLabels[checklistId] || "").trim();
    if (label) {
      onAddItem(checklistId, label);
      setNewItemLabels((prev) => ({ ...prev, [checklistId]: "" }));
      // Refocus input for continuous adding
      setTimeout(() => inputRefs.current[checklistId]?.focus(), 0);
    }
  }, [newItemLabels, onAddItem]);

  const totalItems = checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const checkedItems = checklists.reduce(
    (acc, cl) => acc + cl.items.filter((i) => i.checked).length,
    0,
  );

  if (checklists.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-stone-400">チェックリストがありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary header */}
      <div>
        <h2 className="text-lg font-bold text-stone-800">すべてのチェックリスト</h2>
        <p className="text-xs text-stone-400" aria-live="polite">
          全 {totalItems} アイテム / {checkedItems} 完了
        </p>
      </div>

      {checklists.map((cl) => {
        const checkedCount = cl.items.filter((i) => i.checked).length;
        const isCollapsed = collapsedIds.has(cl.id);

        return (
          <section key={cl.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            {/* Sticky section header */}
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm border-b border-stone-200 px-4 py-3">
              {/* Collapse toggle */}
              <button
                type="button"
                onClick={() => toggleCollapse(cl.id)}
                className="flex h-8 w-6 shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label={isCollapsed ? "展開" : "折りたたみ"}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                >
                  <path d="M3 2L6 5L3 8" />
                </svg>
              </button>

              {/* Name + progress (clicking also toggles) */}
              <button
                type="button"
                onClick={() => toggleCollapse(cl.id)}
                className="flex-1 text-left"
              >
                <h3 className="text-sm font-semibold text-stone-800">{cl.name}</h3>
                {cl.items.length > 0 && (
                  <p className="text-[11px] text-stone-400">
                    {checkedCount}/{cl.items.length} 完了
                  </p>
                )}
              </button>

              {/* Reset button */}
              {cl.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onReset(cl.id)}
                  className="shrink-0 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700"
                >
                  リセット
                </button>
              )}
            </div>

            {/* Section content */}
            {!isCollapsed && (
              <div className="p-4 pt-3">
                {cl.items.length === 0 ? (
                  <p className="py-4 text-center text-xs text-stone-400">
                    アイテムがまだありません
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {cl.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-50"
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-stone-300 transition-colors has-checked:border-blue-500 has-checked:bg-blue-500">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => onToggle(cl.id, item.id)}
                              className="peer sr-only"
                            />
                            {item.checked && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                fill="none"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="pointer-events-none"
                              >
                                <polyline points="2 5 4 7 8 3" />
                              </svg>
                            )}
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm transition-colors ${
                              item.checked
                                ? "text-stone-400 line-through"
                                : "text-stone-700"
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(cl.id, item.id)}
                          className="shrink-0 rounded p-1 text-stone-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          aria-label="削除"
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
                      </div>
                    ))}
                  </div>
                )}

                {/* Add item input */}
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1 shadow-sm transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="shrink-0 text-stone-400"
                  >
                    <line x1="7" y1="2.5" x2="7" y2="11.5" />
                    <line x1="2.5" y1="7" x2="11.5" y2="7" />
                  </svg>
                  <input
                    ref={(el) => {
                      inputRefs.current[cl.id] = el;
                    }}
                    type="text"
                    value={newItemLabels[cl.id] || ""}
                    onChange={(e) =>
                      setNewItemLabels((prev) => ({ ...prev, [cl.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubmit(cl.id);
                    }}
                    placeholder="アイテムを追加..."
                    className="h-8 flex-1 text-sm outline-none placeholder:text-stone-400"
                    aria-label={`${cl.name}に新しいアイテムを追加`}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubmit(cl.id)}
                    disabled={!(newItemLabels[cl.id] || "").trim()}
                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:text-stone-300 disabled:hover:bg-transparent"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
