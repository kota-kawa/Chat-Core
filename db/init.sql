-- utf8mb4 を利用するよう明示
SET NAMES utf8mb4;

-- usersテーブル
CREATE TABLE users (
    id          INT             AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255)    NOT NULL UNIQUE,
    username    VARCHAR(255)    NOT NULL DEFAULT 'トマト',
    bio         TEXT            NULL,
    avatar_url  VARCHAR(255)    NOT NULL DEFAULT '/static/user-icon.png',
    is_verified BOOLEAN         DEFAULT FALSE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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



-- 個人ユーザーが管理するプロンプトとfew shot
CREATE TABLE task_with_examples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- 追加: タスクの所有ユーザー
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  prompt_template TEXT NOT NULL,
  input_examples TEXT,
  output_examples TEXT,
  display_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 外部キー制約
  CONSTRAINT fk_task_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- プロンプト共有のためのテーブル
CREATE TABLE IF NOT EXISTS prompts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,  -- ユーザーIDを追加
    is_public TINYINT(1) NOT NULL DEFAULT 0,  -- 0: 非公開、1: 公開（Booleanと同様の扱い）
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(50) NOT NULL,
    input_examples TEXT,
    output_examples TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- プロンプトリストを管理するテーブル
CREATE TABLE IF NOT EXISTS prompt_list_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_id INT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT '',
    content TEXT NOT NULL,
    input_examples TEXT,
    output_examples TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prompt_list_user_prompt (user_id, prompt_id),
    KEY idx_prompt_list_user_title (user_id, title(191)),
    CONSTRAINT fk_prompt_list_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_prompt_list_prompt
        FOREIGN KEY (prompt_id)
        REFERENCES prompts(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;





-- メール作成
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '📧 メール作成',
  '状況や作業環境をもとに、メールを作成して。',
  '新製品リリースの案内のメール作成をしたい。',
  '件名：新製品発売のご案内\n本文：拝啓　時下ますますご健勝のこととお慶び申し上げます。さて、この度弊社では画期的な新製品をリリースいたしましたので、ご案内申し上げます。つきましては、詳細資料を同封いたしましたのでご一読いただけますと幸甚です。今後とも何卒よろしくお願い申し上げます。',
  0
);

-- アイデア発想
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '💡 アイデア発想',
  '独創的なアイデアの発想をしてほしい。',
  '店舗の集客を増やすためのアイデアを考えて。',
  '1. お得なクーポン付きSNSキャンペーンの実施 2. 店舗イベントの定期開催 3. 地域の他店舗と連携したスタンプラリー企画',
  1
);

-- 要約
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '📄 要約',
  '状況・作業環境に入力された文を要約して。',
  '長編小説のストーリーを簡潔にまとめたいので、要約して。',
  '本作品は、主人公が旅を通じて自分自身と向き合い、家族の絆を再確認する物語です。主要なテーマは成長と和解で、山場となるシーンでは過去の葛藤を乗り越える様子が描かれています。',
  2
);

-- 問題解決
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '🛠️ 問題解決',
  '問題解決に協力してほしい。',
  '人事トラブル（メンバー同士の衝突）の問題解決をしたい。',
  '1. 当事者双方からヒアリングを行い、事実関係を整理する 2. 第三者が入る調整会議を設定し、意見をすり合わせる 3. 再発防止のためのコミュニケーションルールを策定',
  3
);

-- 問題へ回答
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '📋 問題へ回答',
  '問題へ回答するのを手伝ってほしい。',
  '物理の問題：自由落下の公式を教えてください。',
  '自由落下の距離を表す公式は、d = (1/2)gt^2 です（gは重力加速度、tは落下時間）。初速度が0の場合に適用できます。',
  4
);

-- 情報提供
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  'ℹ️ 情報提供',
  '状況・作業環境に入力されたものについての情報提供をしてほしい。',
  '新型コロナウイルスの最新情報が知りたい。',
  '現在の感染状況は地域によって大きく異なりますが、新しい変異株の動向やワクチン接種の進捗が焦点となっています。最新情報は厚生労働省の公式サイトやWHOのリリースを確認するのが望ましいです。',
  5
);

-- レシピ
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '🍳 レシピ',
  '状況・作業環境に入力された情報をもとにレシピを考えて。',
  '野菜がメインで、ヘルシーな朝食のレシピが知りたい。',
  'グリル野菜と卵を使ったオーブン焼きはいかがでしょう。お好みの野菜（パプリカ、ズッキーニ、玉ねぎなど）をカットして卵と一緒に耐熱皿に入れ、オリーブオイルと塩コショウで調味。オーブンで焼けばヘルシーかつ手軽に作れます。',
  6
);

-- 旅行計画
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '✈️ 旅行計画',
  '状況・作業環境の内容をもとに、旅行計画を立ててほしい。',
  '国内旅行、2泊3日、温泉と自然を満喫したいので、旅行計画を考えて。',
  '草津温泉（群馬県）をおすすめします。1日目は湯畑周辺を散策し、温泉街を楽しむ。2日目は近隣の自然公園で軽いハイキングをして、夜は旅館で温泉三昧。3日目は地元の名物を堪能してから帰路へ。',
  7
);

-- 悩み相談
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '💬 悩み相談',
  '悩み相談にのってほしい。',
  '恋愛で告白する勇気が出ないです。',
  'まずは自分の気持ちを素直に認めましょう。そして、相手とのコミュニケーションで小さなステップを積み重ね、信頼関係を築くことが大切です。失敗を恐れる気持ちはわかりますが、行動しなければ何も変わりません。勇気を出して一歩を踏み出すことで、状況が前向きに進む可能性があります。',
  8
);

-- メッセージへの返答
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '📨 メッセージへの返答',
  '状況・作業環境の内容を踏まえて、メッセージへの返答を一緒に考えてほしい。',
  '上司から「すぐに会議室に来て」とLINEで連絡がきた場合にどのようにメッセージに返答すればよい？',
  '了解しました。すぐに向かいます。何か準備が必要なものはありますか？',
  9
);

-- デート計画
INSERT IGNORE INTO task_with_examples (name, prompt_template, input_examples, output_examples, display_order) VALUES (
  '💑 デート計画',
  '状況・作業環境の内容を踏まえて、デートの計画を立ててほしい。',
  '花火大会に行く予定、夜メインで楽しみたいので、デート計画を立てて。',
  '夕方から浴衣で合流し、屋台で食べ歩きを楽しんだ後、花火をゆっくり観賞。その後は近くのバーで軽くドリンクを飲みながら余韻に浸るのはいかがでしょうか。',
  10
);