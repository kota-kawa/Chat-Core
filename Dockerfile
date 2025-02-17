# ベースイメージを指定
FROM python:3.9-slim

# 作業ディレクトリを設定
WORKDIR /app

# まずは requirements.txt だけをコピー（依存関係のみビルド時にインストール）
COPY requirements.txt requirements.txt

# 必要なパッケージをインストール
RUN pip install --no-cache-dir -r requirements.txt

# wait-for-it.sh を取得してアプリの起動を待機
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# ----
# ※ここでアプリのソースコード全体を COPY してしまうと、
#   ローカルで修正したコードを都度再ビルドしないと反映されなくなるので
#   開発中は以下の COPY . . はコメントアウトしておいても OK。
# ----
# COPY . .

# Flask の環境変数を設定
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV=development  
# デバッグモード（自動リロード）を有効にする
ENV FLASK_DEBUG=1          
# 同上

# アプリケーションの起動コマンド（MySQLが準備できるまで待機してから実行）
# --reload を付けてホットリロードを有効にする
CMD ["./wait-for-it.sh", "db:3306", "--", "flask", "run", "--port=5000", "--reload"]
