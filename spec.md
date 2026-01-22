# Project Specifications & Guidelines

## 全体ルール (General Rules)
<!-- プロジェクト全体で遵守すべき原則 -->
- [ ] フロントエンドは TypeScript を標準とし、新規コードは TS/TSX で追加する
- [ ] 型安全性を優先し、暗黙の any を避ける（型が不明な場合は段階的に定義する）
- [ ] 既存仕様・UI・API 挙動を変えない前提で段階的に移行する
- [ ] 移行は小さく区切り、各ステップでビルド可能な状態を保つ

## コーディング規約 (Coding Conventions)
<!-- 言語ごとのスタイルガイド、フォーマッター設定など -->
- **Python**:
  - 既存の 4 スペースインデントと snake_case を踏襲
- **TypeScript/React**:
  - `.ts`/`.tsx` を使用し、`strict` を前提とした型付けを行う
  - 可能な限り `any` を避け、`unknown` + 型ガードを優先
  - 型定義は `types/` または feature 近傍に配置し、再利用可能に保つ
  - 既存の JavaScript からの移行は `allowJs` で段階的に行う
  - Next.js の推奨設定に従い、`jsx` は `preserve`、`noEmit` を前提にする
  - 既存の外部 JS を型付けできない場合は `*.d.ts` で宣言する

## 命名規則 (Naming Conventions)
<!-- 変数、関数、クラス、ファイル名の命名ルール -->
- **Variables/Functions**: `camelCase`
- **Classes/Types/Interfaces**: `PascalCase`
- **Files**: `kebab-case`（React コンポーネントは `PascalCase.tsx` も可）
- **Constants**: `UPPER_SNAKE_CASE`

## ディレクトリ構成方針 (Directory Structure Policy)
<!-- ファイルの配置ルール、モジュール分割の方針 -->
- `frontend/` 配下で TypeScript を主軸にする
- 型定義は `frontend/types/` または機能ディレクトリ直下に配置する
- `public/static/js` など静的 JS は当面維持し、段階的に移動・置換する
- `frontend/next-env.d.ts` を保持し、Next.js 型定義の基盤とする

## エラーハンドリング方針 (Error Handling Policy)
<!-- 例外処理、ログ出力、ユーザーへのフィードバック方法 -->
- 予期しない例外はコンソールに記録し、UI には汎用エラーメッセージを表示する
- API 失敗時はステータスコードに応じたメッセージと再試行導線を用意する
- 例外の握りつぶしは禁止し、最低限のログを残す

## テスト方針 (Testing Policy)
<!-- テストの種類、カバレッジ目標、使用ツール -->
- **Unit Tests**: 既存の `unittest` を継続（フロントは必要に応じて追加）
- **E2E Tests**: 追加は将来検討（今回の移行では必須にしない）
- **Type Check**: CI またはローカルで `tsc --noEmit` を実行可能にする
- **Type Check Script**: `frontend/package.json` に `typecheck` を用意する
