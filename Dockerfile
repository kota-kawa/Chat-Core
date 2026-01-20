# ベースイメージを指定
FROM python:3.12-slim

# 作業ディレクトリを設定
WORKDIR /app

# まずは requirements.txt だけをコピー（依存関係のみビルド時にインストール）
COPY requirements.txt requirements.txt

# SSL/証明書とpipを最新化してから依存関係をインストール
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# wait-for-it.sh を取得してアプリの起動を待機
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# ----
# ※ここでアプリのソースコード全体を COPY してしまうと、
#   ローカルで修正したコードを都度再ビルドしないと反映されなくなるので
#   開発中は以下の COPY . . はコメントアウトしておいても OK。
# ----
# COPY . .

# FastAPI の起動設定
ENV PORT=5004

# アプリケーションの起動コマンド（PostgreSQLが準備できるまで待機してから実行）
# --reload を付けてホットリロードを有効にする
CMD ["./wait-for-it.sh", "db:5432", "--", "uvicorn", "app:app", "--host=0.0.0.0", "--port=5004", "--reload"]


