## 安全に関するルール (カスタム)

- 推論が反復的になったり、ループを検出したりした場合は、直ちに現在の推論を停止し、同じユーザーのリクエストを最初から送り直し
- 出力が過度に長くなる、またはスタックしているように見える場合は、元のユーザーリクエストを再処理してタスクを再起動
- 不確実またはスタックしている場合は、部分的な、または反復的な出力を続けるのではなく、タスクを再起動
- 「思考中...」、「処理中...」などのプレースホルダーテキスト、または繰り返し記述されるフィラーの生成の場合はタスクを再起動
- **`git --no-verify` / `git commit -n` の使用禁止**: この環境では pre-commit/pre-push hooks を常に強制実行するため、`--no-verify` フラグおよび commit における `-n` 短縮形の使用は禁止する。技術的にも `~/.local/bin/git` ラッパーによりブロックされている。
- **`HUSKY=0` の使用禁止**: husky hook runner を無効化する環境変数。`~/.local/bin/git` によりブロックされている。
- **`git -c core.hooksPath=...` の使用禁止**: hooks のパスを差し替えて bypass する手法。`~/.local/bin/git` によりブロックされている。
- **`GIT_CONFIG_PARAMETERS` / `GIT_CONFIG_KEY_N` 経由の hooksPath 注入禁止**: git 内部設定の環境変数経由の bypass。`~/.local/bin/git` によりブロックされている。

## リソース制約

- **subagentの並列実行はPCスペック上難しいため控えること。**
- 複数のsubagentタスクは直列に実行し、1つのタスクが完了してから次のタスクを開始すること。
- 「複数の独立した作業がある場合は並列起動」とはせず、逐次処理を基本とする。

## ツール使用に関するガイドライン

- `npx` や `npm` を利用せず、`pnpm exec` や `pnpm` を使用してください。
- **sudo を要する操作**: 非対話環境のため `sudo` は直接使えない。代わりに `lxqt-sudo` で GUI パスワードポップアップを raise すること。使用例: `lxqt-sudo <command>`. チェーンする場合は一時スクリプトにまとめて渡す。
- **依存関係の監査・更新に権限昇格が必要な場合**: npm registry への接続などで通常の実行が失敗したときは、対象の `pnpm` コマンドだけを最初から `sandbox_permissions=require_escalated` で実行し、理由と許可範囲を明記すること。昇格は当該コマンドと依存監査・更新の目的に限定し、永続的な sandbox/approval 設定の変更や任意の外部通信は行わない。

## 委譲に関するルール

- Orchestratorは自らコマンド実行を行わない。
- orchestratorが自ら直接編集や探索を行うのではなく、以下の判断基準に従って各agentに積極的に委譲すること：
  - **コード探索・ファイル検索・ファイル内容の読み取り** → `@explorer` に委譲（可能な限りorchestrator自身での `read` を避け、探索・要約を任せること）
  - **外部ライブラリ調査** → `@librarian` に委譲
  - **アーキテクチャ判断・コードレビュー・複雑なデバッグ** → `@oracle` に委譲
  - **UI/UXデザイン・見た目の実装** → `@designer` に委譲
  - **明確な実装作業（複数ファイル跨ぎ含む）** → `@fixer` に委譲
- 単一ファイルの軽微な編集以外は、まず「この作業を委譲できるagentがいるか？」を検討してから実行に移ること
- **依頼単位は小さく保つ**: 1 回の委譲は「1 つの明確な成果物」を単位とし、単位を大きくし過ぎないこと。関心事が混在する場合は分割して別 agent に委譲する。
- **コンテキスト過剰蓄積を防ぐため積極的に新設する**: 既存 agent の context が膨張し続ける場合は同じ役割を抱え込まず、目的特化した新しいサブエージェントを新設して責務を分離する。長大な履歴の再利用より、単位を絞った新規セッションへの再委譲を優先する。
- `@fixer` への委譲時は、自分が既に持っているコンテキスト（ファイル内容など）をpromptに含めて再読込コストを削減すること
- **テスト実装とテスト実行は分離する**: テストの実装は `@fixer` に委譲し、テストの実行・検証は Orchestrator 自身が行う。サブエージェントが自分の実装したテストを自ら実行して検証結果を報告する運用は禁止し、Orchestrator が検証ゲート（lint, type-check, test, coverage, spec-refs, smoke-test）を走らせて結果を確認する。
- **実装内容の一致確認**: サブエージェントの実装完了時は、Orchestrator が実装内容（変更差分・成果物）と委譲時の指示内容が一致していることを確認する。乖離があった場合は、指摘して修正を再委譲してから検証ゲートを通過させる。
- **`@oracle` は見解の提示のみを行う**: `@oracle` は設計判断・アーキテクチャ評価・レビュー・デバッグ方針などの「見解」を返すことに限定し、自ら手を動かした調査（コマンド実行、コードの実行・修正、ファイル漁り）を行ってはならない。根拠となるコードや実行結果が必要な場合は、Orchestrator が事前に収集して委譲時に渡すか、データ取得そのものは `@explorer` / `@librarian` に委譲する。

## 実行モードに関する指示

- ToDoタスクを実行する際は、各ステップごとにユーザーに「続けますか？」などの確認を求めず、最後まで一括して自律的に実行してください。
- 軽微な修正や次のステップへの移行は、ユーザーの明示的な承認を待たずに連続してツール（ファイル編集、コマンド実行など）を呼び出してください。
- すべてのプロセスが完了するか、重大な競合・エラーが発生して進行できない場合のみ、最終結果とともに確認を求めてください。
- ToDoの実行という指示は、全ステップの自動実行に対する事前承認を意味します。

## サブエージェント設定

- サブエージェントの設定ファイル: `/home/menon/.config/opencode/oh-my-opencode-slim.json`

## プロジェクト仕様書

- OpenSpec 仕様書: `openspec/specs/belongings/spec.md`

<internal_reminder>!IMPORTANT! Scheduler workflow: plan lanes/dependencies → dispatch background specialists → track task IDs → wait for hook-driven completion → reconcile terminal results → verify. Do not poll running jobs, consume running-job output, or advance dependent work. !END!</internal_reminder>

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
