# Current Task Context

## 今回やること・目的 (Goal/Objective)
<!-- 何のために何をするのか簡潔に記述 -->
- [ ] フロントエンドを TypeScript へ**全面移行**し、JS 依存を解消する

## やること (Must)
<!-- 具体的なタスクリスト -->
- [ ] `frontend/tsconfig.json` を追加して `strict` を前提とした全面移行設定を行う（`allowJs` は使わない）
- [ ] TypeScript 依存関係を追加（`typescript`, `@types/react`, `@types/node`）
- [ ] `frontend/next-env.d.ts` を追加して Next.js の型定義を有効化する
- [ ] `pages/` 配下の全ページを `.tsx` に移行（必要最低限の型付けで可）
- [ ] `frontend/` 配下の `.js`/`.jsx` をすべて `.ts`/`.tsx` に移行する（`pages/` 以外も含む）
- [ ] `frontend/public/static/js`（公開パスは `/static/js`）のスクリプトを TypeScript 化または置換し、JS 資産を残さない
- [ ] `next.config.js`/ビルド設定で TS を有効化（必要な場合のみ）
- [ ] 型定義の配置方針を決め、`frontend/types/` を用意する
- [ ] `package.json` に `typecheck` スクリプトを追加する
- [ ] 既存 JS を残さず移行し、ビルドが通ることを確認する

## やらないこと (Non-goals)
<!-- 今回のスコープ外のこと -->
- [ ] UI/機能のリファクタリングや仕様変更
- [ ] 既存の API 仕様変更
- [ ] E2E テスト基盤の新規導入

## 受け入れ基準 (Acceptance Criteria)
<!-- 完了とみなす条件 -->
- [ ] `frontend` の `dev`/`build` が TypeScript 設定で通る
- [ ] `.tsx` に移行したページがレンダリング可能である
- [ ] `tsc --noEmit` が致命的エラー無しで完了する（`any` の乱用は避ける）
- [ ] `frontend/` と `frontend/public/static/js` に `.js`/`.jsx` が残っていない
- [ ] `typecheck` スクリプトが実行可能である
- [ ] **すべてのテストに合格していること**（移行完了条件）

## 移行完了後の整理 (Post-migration cleanup)
<!-- 移行が一通り終わった後に行う整理・削除項目 -->
- [ ] `.tsx` 化済みページの旧 `.js` ファイルは、**必ずテストを作成し、そのテストが成功した場合に限り削除する**
- [ ] 旧 JS 参照（import/require、ルーティング設定）が残っていないか確認する
- [ ] 一時的な `any` や暫定型定義を棚卸しし、置き換え候補を洗い出す
- [ ] 主要画面の動作確認（ログイン/設定/管理画面）後に削除を確定する

## 影響範囲 (Impact/Scope)
<!-- 変更するファイルや注意すべき既存機能 -->
- **触るファイル**:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/tsconfig.json`
  - `frontend/next-env.d.ts`
  - `frontend/**/*.js`
  - `frontend/**/*.jsx`
  - `frontend/public/static/js/**`
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
  - 既存の静的 JS 連携の挙動（`frontend/public/static/js` は移行対象だが挙動維持）
