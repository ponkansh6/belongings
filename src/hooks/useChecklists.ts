"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Checklist } from "@/lib/types";
import { loadChecklists, saveChecklists, createChecklist, createItem } from "@/lib/storage";

export type ActiveView = { type: "list"; checklistId: string } | { type: "all" };

export function useChecklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>({ type: "all" });

  // Load from localStorage on mount
  useEffect(() => {
    setChecklists(loadChecklists());
    setLoaded(true);
  }, []);

  // Persist to localStorage on change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const saved = saveChecklists(checklists);
      if (!saved) {
        alert("データの保存に失敗しました。ストレージの容量を確認してください。");
      }
    }, 300);
    return () => clearTimeout(saveTimerRef.current);
  }, [checklists, loaded]);

  // --- List operations ---
  const addChecklist = useCallback((name: string): string => {
    const newList = createChecklist(name);
    setChecklists((prev) => [...prev, newList]);
    return newList.id;
  }, []);

  const renameChecklist = useCallback((id: string, name: string) => {
    setChecklists((prev) => prev.map((cl) => (cl.id === id ? { ...cl, name } : cl)));
  }, []);

  const deleteChecklist = useCallback((id: string) => {
    setChecklists((prev) => prev.filter((cl) => cl.id !== id));
  }, []);

  const reorderChecklists = useCallback((fromIndex: number, toIndex: number) => {
    setChecklists((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // --- Item operations ---
  const addItem = useCallback((checklistId: string, label: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId ? { ...cl, items: [...cl.items, createItem(label)] } : cl,
      ),
    );
  }, []);

  const toggleItem = useCallback((checklistId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
              ...cl,
              items: cl.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item,
              ),
            }
          : cl,
      ),
    );
  }, []);

  const deleteItem = useCallback((checklistId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.filter((item) => item.id !== itemId) }
          : cl,
      ),
    );
  }, []);

  const reorderItems = useCallback((checklistId: string, fromIndex: number, toIndex: number) => {
    setChecklists((prev) =>
      prev.map((cl) => {
        if (cl.id !== checklistId) return cl;
        const next = [...cl.items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...cl, items: next };
      }),
    );
  }, []);

  const resetList = useCallback((checklistId: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map((item) => ({ ...item, checked: false })) }
          : cl,
      ),
    );
  }, []);

  const resetAll = useCallback(() => {
    setChecklists((prev) =>
      prev.map((cl) => ({
        ...cl,
        items: cl.items.map((item) => ({ ...item, checked: false })),
      })),
    );
  }, []);

  // --- Derived ---
  const selectedChecklist =
    activeView.type === "list"
      ? (checklists.find((cl) => cl.id === activeView.checklistId) ?? null)
      : null;

  return {
    checklists,
    loaded,
    activeView,
    setActiveView,
    selectedChecklist,
    addChecklist,
    renameChecklist,
    deleteChecklist,
    reorderChecklists,
    addItem,
    toggleItem,
    deleteItem,
    reorderItems,
    resetList,
    resetAll,
  };
}
