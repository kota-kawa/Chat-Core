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


-- promptの共有に必要な部分

-- promptsテーブル（新規追加）
CREATE TABLE prompts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- bookmarksテーブル（新規追加）
CREATE TABLE bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prompt_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_prompt (user_id, prompt_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id)
);

-- categoriesテーブル（新規追加：カテゴリを動的に管理する場合）
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT NULL
);