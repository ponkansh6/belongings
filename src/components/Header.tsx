"use client";

interface HeaderProps {
  onResetAll: () => void;
  hasChecklists: boolean;
}

export default function Header({ onResetAll, hasChecklists }: HeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-800">
          Belongings Checker
        </h1>
        <p className="text-xs text-stone-400">出かける前の忘れ物チェック</p>
      </div>
      {hasChecklists && (
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-500 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 active:bg-stone-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 7C1 3.5 3.5 1 7 1C10.5 1 13 3.5 13 7C13 10.5 10.5 13 7 13C4.5 13 2.5 11.5 1.5 10" />
            <polyline points="4 7 1 7 1 4" />
          </svg>
          すべてリセット
        </button>
      )}
    </header>
  );
}
