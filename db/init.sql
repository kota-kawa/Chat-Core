-- utf8mb4 を利用するよう明示
SET NAMES utf8mb4;

-- usersテーブル
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- chat_roomsテーブル
CREATE TABLE chat_rooms (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT '新規チャット',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- chat_historyテーブル
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_room_id VARCHAR(255),
    message TEXT,
    sender ENUM('user','assistant'),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- プロンプトとfew shot
CREATE TABLE IF NOT EXISTS task_with_examples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  prompt_template TEXT,
  few_shot_examples TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
  ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;





-- メール作成
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '📧 メール作成',
  '【状況・作業環境】{環境}\n【リクエスト】メール作成',
  '[{"input": "【状況・作業環境】新製品リリースの案内\n【リクエスト】メール作成", "output": "例：件名：新製品発売のご案内\n本文：拝啓　時下ますますご健勝のこととお慶び申し上げます。さて、この度弊社では画期的な新製品をリリースいたしましたので、ご案内申し上げます。つきましては、詳細資料を同封いたしましたのでご一読いただけますと幸甚です。今後とも何卒よろしくお願い申し上げます。"}, {"input": "【状況・作業環境】取引先への謝罪\n【リクエスト】メール作成", "output": "例：件名：納期遅延に関するお詫び\n本文：平素より大変お世話になっております。この度は弊社の都合により納品が遅れましたこと、深くお詫び申し上げます。再発防止に向けた取り組みを進めておりますので、今後とも何卒ご指導のほどよろしくお願い申し上げます。"}]'
);

-- アイデア発想
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '💡 アイデア発想',
  '【状況・作業環境】{環境}\n【リクエスト】アイデア発想',
  '[{"input": "【状況・作業環境】店舗の集客を増やすためのアイデア\n【リクエスト】アイデア発想", "output": "例：1. お得なクーポン付きSNSキャンペーンの実施 2. 店舗イベントの定期開催 3. 地域の他店舗と連携したスタンプラリー企画"}, {"input": "【状況・作業環境】新しいモバイルアプリのコンセプト\n【リクエスト】アイデア発想", "output": "例：1. パーソナライズされたニュースフィードアプリ 2. AIを活用した健康管理アプリ 3. AR機能を使った街歩きガイドアプリ"}]'
);

-- 要約
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '📄 要約',
  '【状況・作業環境】{環境}\n【リクエスト】要約',
  '[{"input": "【状況・作業環境】長編小説のストーリーを簡潔にまとめたい\n【リクエスト】要約", "output": "例：本作品は、主人公が旅を通じて自分自身と向き合い、家族の絆を再確認する物語です。主要なテーマは成長と和解で、山場となるシーンでは過去の葛藤を乗り越える様子が描かれています。"}, {"input": "【状況・作業環境】技術仕様書\n【リクエスト】要約", "output": "例：この仕様書は、製品が備える機能一覧と必要なハードウェア要件を詳細に記しています。主なポイントはシステム要件の厳密な定義と拡張性を確保するための設計コンセプトです。"}]'
);


-- 問題解決
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '🛠️ 問題解決',
  '【状況・作業環境】{環境}\n【リクエスト】問題解決',
  '[{"input": "【状況・作業環境】人事トラブル（メンバー同士の衝突）\n【リクエスト】問題解決", "output": "例：1. 当事者双方からヒアリングを行い、事実関係を整理する 2. 第三者が入る調整会議を設定し、意見をすり合わせる 3. 再発防止のためのコミュニケーションルールを策定"}, {"input": "【状況・作業環境】財務上の資金繰りが厳しい\n【リクエスト】問題解決", "output": "例：1. コスト削減可能な項目の洗い出し 2. 銀行または投資家への融資・増資の検討 3. キャッシュフローを改善するための短期的売上強化施策の実行"}]'
);

-- 問題へ回答
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '📋 問題へ回答',
  '【状況・作業環境】{環境}\n【リクエスト】問題へ回答',
  '[{"input": "【状況・作業環境】物理の問題：自由落下の公式を教えてください\n【リクエスト】問題へ回答", "output": "例：自由落下の距離を表す公式は、d = (1/2)gt^2 です（gは重力加速度、tは落下時間）。初速度が0の場合に適用できます。"}, {"input": "【状況・作業環境】歴史の問題：鎌倉幕府が成立した年は？\n【リクエスト】問題へ回答", "output": "例：鎌倉幕府が成立したのは1192年とされています（一般的には1192年に源頼朝が征夷大将軍に任命されたことをもって成立とみなします）。"}]'
);

-- 情報提供
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  'ℹ️ 情報提供',
  '【状況・作業環境】{環境}\n【リクエスト】情報提供',
  '[{"input": "【状況・作業環境】新型コロナウイルスの最新情報\n【リクエスト】情報提供", "output": "例：現在の感染状況は地域によって大きく異なりますが、新しい変異株の動向やワクチン接種の進捗が焦点となっています。最新情報は厚生労働省の公式サイトやWHOのリリースを確認するのが望ましいです。"}, {"input": "【状況・作業環境】話題のダイエットトレンド\n【リクエスト】情報提供", "output": "例：最近は糖質を適度に抑えつつ、良質なタンパク質と野菜をバランスよく摂取する“ローカーボ＋高タンパク”ダイエットが注目を集めています。また、16時間の断食と8時間の食事で体内リズムを整える“16時間断食”も話題です。"}]'
);

-- レシピ
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '🍳 レシピ',
  '【状況・作業環境】{環境}\n【リクエスト】レシピ',
  '[{"input": "【状況・作業環境】野菜がメインで、ヘルシーな朝食\n【リクエスト】レシピ", "output": "例：グリル野菜と卵を使ったオーブン焼きはいかがでしょう。お好みの野菜（パプリカ、ズッキーニ、玉ねぎなど）をカットして卵と一緒に耐熱皿に入れ、オリーブオイルと塩コショウで調味。オーブンで焼けばヘルシーかつ手軽に作れます。"}, {"input": "【状況・作業環境】寒い日に食べたくなる和食のスイーツ\n【リクエスト】レシピ", "output": "例：白玉ぜんざいはいかがでしょうか。白玉粉に水を加えてこね、丸めて茹でた白玉を温かいあんこに浮かべます。仕上げに少量の塩を加えると甘みが引き立ちます。"}]'
);

-- 旅行計画
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '✈️ 旅行計画',
  '【状況・作業環境】{環境}\n【リクエスト】旅行計画',
  '[{"input": "【状況・作業環境】国内旅行、2泊3日、温泉と自然を満喫したい\n【リクエスト】旅行計画", "output": "例：草津温泉（群馬県）をおすすめします。1日目は湯畑周辺を散策し、温泉街を楽しむ。2日目は近隣の自然公園で軽いハイキングをして、夜は旅館で温泉三昧。3日目は地元の名物を堪能してから帰路へ。"}, {"input": "【状況・作業環境】スキー旅行、3泊4日、雪山をしっかり楽しみたい\n【リクエスト】旅行計画", "output": "例：北海道のニセコはいかがでしょうか。1日目はスキー場近くのホテルにチェックイン、2-3日目はゲレンデでスキーやスノーボードを満喫。夜は温泉や地元の海鮮料理を楽しむ。4日目はゆっくりチェックアウトし、お土産を購入してから空港へ。"}]'
);

-- 悩み相談
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '💬 悩み相談',
  '【状況・作業環境】{環境}\n【リクエスト】悩み相談',
  '[{"input": "【状況・作業環境】恋愛で告白する勇気が出ない\n【リクエスト】悩み相談", "output": "例：まずは自分の気持ちを素直に認めましょう。そして、相手とのコミュニケーションで小さなステップを積み重ね、信頼関係を築くことが大切です。失敗を恐れる気持ちはわかりますが、行動しなければ何も変わりません。勇気を出して一歩を踏み出すことで、状況が前向きに進む可能性があります。"}, {"input": "【状況・作業環境】将来のキャリアに悩んでいる\n【リクエスト】悩み相談", "output": "例：まずは自分の得意分野ややりがいを感じることをリストアップしてみましょう。次に、業界研究や先輩・上司へのインタビューを行い、具体的なキャリアパスをイメージすると道筋が見えやすくなります。新しい分野への挑戦も含め、情報収集をしながら自分に合った選択肢を探ってみてください。"}]'
);

-- メッセージへの返答
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '📨 メッセージへの返答',
  '【状況・作業環境】{環境}\n【リクエスト】メッセージへの返答',
  '[{"input": "【状況・作業環境】上司から「すぐに会議室に来て」とLINEで連絡がきた場合\n【リクエスト】メッセージ返答", "output": "例：了解しました。すぐに向かいます。何か準備が必要なものはありますか？"}, {"input": "【状況・作業環境】久しぶりの友人から「元気にしてた？」というメッセージ\n【リクエスト】メッセージ返答", "output": "例：久しぶり！元気だよ。そっちはどう？今度時間あるときに会おうよ。"}]'
);

-- デート計画
INSERT IGNORE INTO task_with_examples (name, prompt_template, few_shot_examples) VALUES (
  '💑 デート計画',
  '【状況・作業環境】{環境}\n【リクエスト】デート計画',
  '[{"input": "【状況・作業環境】花火大会に行く予定、夜メインで楽しみたい\n【リクエスト】デート計画", "output": "例：夕方から浴衣で合流し、屋台で食べ歩きを楽しんだ後、花火をゆっくり観賞。その後は近くのバーで軽くドリンクを飲みながら余韻に浸るのはいかがでしょうか。"}, {"input": "【状況・作業環境】雨の日でも一日楽しめる都内のプラン\n【リクエスト】デート計画", "output": "例：午前中は駅直結のショッピングモールでウィンドウショッピング、午後は室内型のテーマパークや水族館を楽しむ。夜は少し雰囲気のあるレストランやカフェでゆっくり過ごせるプランがおすすめです。"}]'
);