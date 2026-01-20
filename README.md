# Strike_Chat

## 概要
Strike_Chat は FastAPI で実装されたシンプルな AI チャットアプリケーションです。メールアドレスによる認証機構を備え、Groq や Google Gemini API と連携してチャットを行います。MySQL をバックエンドに使用し、プロンプト共有機能も提供しています。

## 主な機能
- **メールアドレス認証**: 6 桁のコードをメール送信し、本人確認を行います。
- **チャット機能**: 永続化チャットと一定時間で消えるエフェメラルチャットを利用できます。
- **プロンプト共有**: 作成したプロンプトを公開・検索し、他ユーザーと共有できます。
- **Groq / Gemini 連携**: LLM を用いた回答生成をサポートします。

## セットアップ
### 依存パッケージ
`requirements.txt` に記載された Python パッケージを利用します。Docker で起動する場合は自動的にインストールされます。

### 必要な環境変数
アプリ起動前に以下の環境変数を設定してください。
- `GROQ_API_KEY` : Groq API のキー
- `Gemini_API_KEY` : Google Generative AI の API キー
- `FLASK_SECRET_KEY` : セッションで使用する秘密鍵
- `SEND_ADDRESS` / `SEND_PASSWORD` : 認証メール送信用の Gmail アカウント
- `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` : MySQL 接続情報
- `FLASK_ENV` : `production` の場合は SameSite/secure 設定を強化します

Docker Compose を利用する場合は `.env` ファイルに記述するか、`docker-compose.yml` の `environment` セクションを編集します。

### Docker での起動手順
```sh
# リポジトリを取得
git clone <repository url>
cd Strike_Chat

# 必要な環境変数を .env に記述
# GROQ_API_KEY=xxxxx など

# ビルドして起動
docker-compose up --build
```
ブラウザで `http://localhost:5004` にアクセスするとアプリが利用できます。

### ローカル環境での実行
Docker を使わない場合、Python 3.10 以上の環境で次を実行します。
```sh
pip install -r requirements.txt
export GROQ_API_KEY=...
export Gemini_API_KEY=...
export FLASK_SECRET_KEY=...
uvicorn app:app --reload --host 0.0.0.0 --port 5004
```

## ディレクトリ構成
- `app.py` : FastAPI アプリケーションのエントリーポイント
- `auth.py` / `verification.py` : ユーザー登録・ログイン関連
- `chat/` : チャット機能のルートと処理（複数ファイルに分割）
- `prompt_share/` : プロンプト共有モジュール
- `templates/` : HTML テンプレート
- `static/` : CSS・JavaScript・画像などの静的ファイル
- `db/init.sql` : 初期データベーススキーマ

## CSSガイドライン
- `static/css/base/` : 変数、リセット、ボタン、レスポンシブ設定などの基盤スタイルを配置します。
- `static/css/components/` : サイドバーやモーダルなど再利用可能なコンポーネントスタイルをまとめます。
- `static/css/pages/<page>/index.css` : 各ページのエントリーポイントとなるCSS。`base/base.css` や必要なコンポーネントを `@import` します。

クラス名は BEM 風の `kebab-case` を推奨し、各CSSファイルの冒頭に目的と依存関係をコメントで記述します。HTML テンプレートでは各ページの `index.css` のみを読み込みます。

## 本番運用のポイント
- `FLASK_ENV=production` にして SameSite/Secure を有効化し、`FLASK_SECRET_KEY` などの機密情報は環境変数から読み込むようにしてください。
- 依存パッケージのバージョンを固定し、定期的にアップデートを行うと安全です。
- 認証用メールアカウントの情報はリポジトリに含めず、秘密管理サービスの利用を検討してください。

## ライセンス
本リポジトリにはライセンスファイルが未配置です。公開する際は適切なライセンスを選択し `LICENSE` ファイルを追加してください。
