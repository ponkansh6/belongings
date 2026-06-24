# Belongings Checker - Deepwork Progress ✅ 完了

## Goal

出勤やお出かけ前に忘れ物をチェックするためのシングルページアプリケーション。

## ファイル構成

```
src/
  app/
    layout.tsx            # Root layout
    page.tsx              # Client Component (main page)
    globals.css           # Tailwind
  lib/
    types.ts              # ChecklistItem, Checklist, AppData
    storage.ts            # localStorage CRUD + version migration
    seed.ts               # 初期シードデータ (出勤/お出かけ/ジム)
  hooks/
    useChecklists.ts      # 状態管理 (useState + debounced save)
    useDragReorder.ts     # カスタムDnD (pointer events, threshold, Escape)
  components/
    Header.tsx            # アプリヘッダー + すべてリセット
    Sidebar.tsx           # リスト一覧・作成・削除・リネーム・DnD並び替え
    ChecklistItems.tsx    # 項目一覧・追加・チェック・DnD並び替え
```

## Oracle レビューからの修正対応

| 優先度 | 項目                             | 対応                    |
| ------ | -------------------------------- | ----------------------- |
| P0     | シードIDが毎回再生成される       | ✅ 固定IDを使用         |
| P0     | 保存がレンダリング毎に発火       | ✅ 300ms デバウンス     |
| P0     | ドラッグ中にスクロールブロック   | ✅ 8px閾値で活性化      |
| P0     | 削除時のactiveView不整合         | ✅ 削除コールバック修正 |
| P0     | 容量エラーのフィードバックなし   | ✅ alert追加            |
| P1     | キーボードDnD/Escape             | ✅ Escapeキャンセル追加 |
| P1     | ARIA-live領域                    | ✅ カウント表示に追加   |
| P1     | チェックボックス二重読み上げ     | ✅ aria-label削除       |
| P1     | ストレージマイグレーション永続化 | ✅ saveBack追加         |

## 実行コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm type-check   # 型チェック
pnpm build        # プロダクションビルド
```
