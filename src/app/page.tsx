"use client";

import { useChecklists } from "@/hooks/useChecklists";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChecklistItems from "@/components/ChecklistItems";

export default function Home() {
  const {
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
  } = useChecklists();

  if (!loaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-blue-500" />
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-stone-50 p-4 md:p-6">
      <Header onResetAll={resetAll} hasChecklists={checklists.length > 0} />

      <div className="flex flex-1 flex-col gap-6 md:grid md:grid-cols-[280px_1fr] md:gap-8">
        {/* Sidebar */}
        <Sidebar
          checklists={checklists}
          activeView={activeView}
          onSelect={(id) => setActiveView({ type: "list", checklistId: id })}
          onAdd={addChecklist}
          onRename={renameChecklist}
          onDelete={(id) => {
            deleteChecklist(id);
            if (activeView.type === "list" && activeView.checklistId === id) {
              setActiveView({ type: "all" });
            }
          }}
          onReorder={reorderChecklists}
        />

        {/* Main content */}
        <main className="min-h-0">
          {selectedChecklist ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-6">
              <ChecklistItems
                checklist={selectedChecklist}
                onToggle={(itemId) => toggleItem(selectedChecklist.id, itemId)}
                onAddItem={(label) => addItem(selectedChecklist.id, label)}
                onDeleteItem={(itemId) => deleteItem(selectedChecklist.id, itemId)}
                onReorderItems={(from, to) => reorderItems(selectedChecklist.id, from, to)}
                onReset={() => resetList(selectedChecklist.id)}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border-2 border-dashed border-stone-200">
              <div className="text-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-3 text-stone-300"
                >
                  <rect x="3" y="5" width="26" height="22" rx="3" />
                  <line x1="9" y1="12" x2="23" y2="12" />
                  <line x1="9" y1="17" x2="23" y2="17" />
                  <line x1="9" y1="22" x2="17" y2="22" />
                </svg>
                <p className="text-sm font-medium text-stone-400">
                  チェックリストを選択してください
                </p>
                <p className="mt-1 text-xs text-stone-300">
                  左のサイドバーからリストを選ぶか、新しいリストを作成してください
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[11px] text-stone-400">Belongings Checker</footer>
    </div>
  );
}
