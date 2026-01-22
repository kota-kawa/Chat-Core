# Current Task Context

## 今回やること・目的 (Goal/Objective)
<!-- 何のために何をするのか簡潔に記述 -->
- [ ] フロントエンドの TypeScript 移行を開始し、段階的に運用可能な基盤を整える

## やること (Must)
<!-- 具体的なタスクリスト -->
- [ ] `frontend/tsconfig.json` を追加して `strict` + `allowJs` の段階移行設定を行う
- [ ] TypeScript 依存関係を追加（`typescript`, `@types/react`, `@types/node`）
- [ ] `frontend/next-env.d.ts` を追加して Next.js の型定義を有効化する
- [ ] `pages/` 配下の全ページを `.tsx` に移行（最小限の型付け）
- [ ] `next.config.js`/ビルド設定で TS を有効化（必要な場合のみ）
- [ ] 型定義の配置方針を決め、`frontend/types/` を用意する
- [ ] `package.json` に `typecheck` スクリプトを追加する
- [ ] 既存 JS との共存前提でビルドが通ることを確認する

## やらないこと (Non-goals)
<!-- 今回のスコープ外のこと -->
- [ ] `public/static/js` の全面移行
- [ ] UI/機能のリファクタリングや仕様変更
- [ ] 既存の API 仕様変更
- [ ] E2E テスト基盤の新規導入

## 受け入れ基準 (Acceptance Criteria)
<!-- 完了とみなす条件 -->
- [ ] `frontend` の `dev`/`build` が TypeScript 設定で通る
- [ ] `.tsx` に移行したページがレンダリング可能である
- [ ] `tsc --noEmit` が致命的エラー無しで完了する（必要なら段階的に `any` で回避）
- [ ] JS/TS の混在状態でもエラーなく動作する
- [ ] `typecheck` スクリプトが実行可能である

## 影響範囲 (Impact/Scope)
<!-- 変更するファイルや注意すべき既存機能 -->
- **触るファイル**:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/tsconfig.json`
  - `frontend/next-env.d.ts`
  - `frontend/pages/_app.tsx`
  - `frontend/pages/_document.tsx`
  - `frontend/pages/index.tsx`
  - `frontend/pages/login.tsx`
  - `frontend/pages/register.tsx`
  - `frontend/pages/settings.tsx`
  - `frontend/pages/memo.tsx`
  - `frontend/pages/prompt_share/index.tsx`
  - `frontend/pages/prompt_share/manage_prompts.tsx`
  - `frontend/pages/admin/index.tsx`
  - `frontend/pages/admin/login.tsx`
- **壊しちゃいけない挙動**:
  - 既存ページのレンダリングとルーティング
  - フォーム送信や認証まわりの挙動
  - 既存の静的 JS 連携（`public/static/js`）
