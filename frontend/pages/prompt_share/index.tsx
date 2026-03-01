import Head from "next/head";
import { useEffect } from "react";

const bodyMarkup = `
<!-- 浮遊メニュー -->
  <action-menu></action-menu>

  <!-- 未ログイン時の認証ボタン -->
  <div id="auth-buttons" style="display:none; position:absolute; top:10px; right:10px;  z-index: 999;">
    <button id="login-btn" class="auth-btn">
      <i class="bi bi-person-circle"></i>
      <span>ログイン</span>
    </button>
  </div>

  <!-- ログイン後のユーザーアイコン -->
  <user-icon id="userIcon" style="display:none;"></user-icon>

  <!-- ヘッダー -->
  <header class="prompts-header">

    <!-- ヘッダー背景画像上に中央配置される検索フォーム -->
    <div class="search-section">
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="キーワードでプロンプトを検索..." />
        <button id="searchButton">
          <i class="bi bi-search"></i>
        </button>
      </div>
    </div>
  </header>

  <main>
    <!-- カテゴリ選択セクション -->
    <section class="categories">
      <h2>カテゴリ一覧</h2>
      <div class="category-list">
        <div class="category-card active" data-category="all">
          <i class="bi bi-grid"></i>
          <span>全て</span>
        </div>
        <div class="category-card" data-category="恋愛">
          <i class="bi bi-heart-fill"></i>
          <span>恋愛</span>
        </div>
        <div class="category-card" data-category="勉強">
          <i class="bi bi-book"></i>
          <span>勉強</span>
        </div>
        <div class="category-card" data-category="趣味">
          <i class="bi bi-camera"></i>
          <span>趣味</span>
        </div>
        <div class="category-card" data-category="仕事">
          <i class="bi bi-briefcase"></i>
          <span>仕事</span>
        </div>
        <div class="category-card" data-category="その他">
          <i class="bi bi-stars"></i>
          <span>その他</span>
        </div>
        <div class="category-card" data-category="スポーツ">
          <i class="bi bi-trophy"></i>
          <span>スポーツ</span>
        </div>
        <div class="category-card" data-category="音楽">
          <i class="bi bi-music-note"></i>
          <span>音楽</span>
        </div>
        <div class="category-card" data-category="旅行">
          <i class="bi bi-geo-alt"></i>
          <span>旅行</span>
        </div>
        <div class="category-card" data-category="グルメ">
          <i class="bi bi-shop"></i>
          <span>グルメ</span>
        </div>
      </div>
    </section>

    <div id="promptResults"></div>

    <!-- プロンプト一覧セクション -->
    <section class="prompts-list">
      <h2 id="selected-category-title">全てのプロンプト</h2>
      <div class="prompt-cards">
        <!-- プロンプトカードの例 -->
        <div class="prompt-card" data-category="恋愛">
          <button class="meatball-menu" type="button" aria-label="その他の操作" aria-haspopup="true" aria-expanded="false">
            <i class="bi bi-three-dots"></i>
          </button>
          <div class="prompt-actions-dropdown" role="menu">
            <button class="dropdown-item" type="button" role="menuitem">プロンプトリストに保存</button>
            <button class="dropdown-item" type="button" role="menuitem">ミュート</button>
            <button class="dropdown-item" type="button" role="menuitem">報告する</button>
          </div>
          <h3>告白のアドバイス</h3>
          <p>好きな人に気持ちを伝える時に使えるプロンプト例。</p>
          <div class="prompt-meta">
            <div class="prompt-meta-info">
              <span>カテゴリ: 恋愛</span>
              <span>投稿者: ユーザーA</span>
            </div>
            <div class="prompt-actions">
              <button class="prompt-action-btn comment-btn" type="button" aria-label="コメント">
                <i class="bi bi-chat-dots"></i>
              </button>
              <button class="prompt-action-btn like-btn" type="button" aria-label="いいね">
                <i class="bi bi-heart"></i>
              </button>
              <button class="prompt-action-btn bookmark-btn" type="button" aria-label="ブックマーク">
                <i class="bi bi-bookmark"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="prompt-card" data-category="その他">
          <button class="meatball-menu" type="button" aria-label="その他の操作" aria-haspopup="true" aria-expanded="false">
            <i class="bi bi-three-dots"></i>
          </button>
          <div class="prompt-actions-dropdown" role="menu">
            <button class="dropdown-item" type="button" role="menuitem">プロンプトリストに保存</button>
            <button class="dropdown-item" type="button" role="menuitem">ミュート</button>
            <button class="dropdown-item" type="button" role="menuitem">報告する</button>
          </div>
          <h3>友人へのメッセージ</h3>
          <p>誕生日や励ましのメッセージなどに使えるプロンプト例。</p>
          <div class="prompt-meta">
            <div class="prompt-meta-info">
              <span>カテゴリ: その他</span>
              <span>投稿者: ユーザーJ</span>
            </div>
            <div class="prompt-actions">
              <button class="prompt-action-btn comment-btn" type="button" aria-label="コメント">
                <i class="bi bi-chat-dots"></i>
              </button>
              <button class="prompt-action-btn like-btn" type="button" aria-label="いいね">
                <i class="bi bi-heart"></i>
              </button>
              <button class="prompt-action-btn bookmark-btn" type="button" aria-label="ブックマーク">
                <i class="bi bi-bookmark"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- 投稿モーダル -->
  <div id="postModal" class="post-modal">
    <div class="post-modal-content">
      <span class="close-btn">&times;</span>
      <h2>新しいプロンプトを投稿</h2>
      <form class="post-form" id="postForm">

        <div class="form-group">
          <label for="prompt-title">タイトル</label>
          <input type="text" id="prompt-title" placeholder="プロンプトのタイトルを入力" required />
        </div>
        <div class="form-group">

          <label for="prompt-category">カテゴリ</label>
          <select id="prompt-category" required>
            <option value="未選択" selected>未選択</option>
            <option value="恋愛">恋愛</option>
            <option value="勉強">勉強</option>
            <option value="趣味">趣味</option>
            <option value="仕事">仕事</option>
            <option value="その他">その他</option>
            <option value="スポーツ">スポーツ</option>
            <option value="音楽">音楽</option>
            <option value="旅行">旅行</option>
            <option value="グルメ">グルメ</option>
          </select>
        </div>
        <div class="form-group">
          <label for="prompt-content">プロンプト内容</label>
          <textarea id="prompt-content" rows="5" placeholder="具体的なプロンプト内容を入力" required></textarea>
        </div>
        <div class="form-group">
          <label for="prompt-author">投稿者名</label>
          <input type="text" id="prompt-author" placeholder="ニックネームなど" value="アイデア職人" required />
        </div>
        <!-- ガードレールの使用チェック -->
        <div class="form-group">
          <label>
            <input type="checkbox" id="guardrail-checkbox"> 入出力例を追加する
          </label>
        </div>

        <!-- ガードレールチェック時に表示する入力例・出力例のフィールド -->
        <div id="guardrail-fields" style="display: none;">
          <div class="form-group">
            <label for="prompt-input-example">入力例（プロンプト内容とは別にしてください）</label>
            <textarea id="prompt-input-example" rows="3" placeholder="例: 夏休みの思い出をテーマにした短いエッセイを書いてください。"></textarea>
          </div>
          <div class="form-group">
            <label for="prompt-output-example">出力例</label>
            <textarea id="prompt-output-example" rows="3"
              placeholder="例: 夏休みのある日、私は家族と一緒に海辺へ出かけました。波の音と潮風に包まれながら、子供の頃の記憶がよみがえり、心が温かくなりました。その日は一生忘れられない、宝物のような時間となりました。"></textarea>
          </div>
        </div>

        <button type="submit" class="submit-btn">
          <i class="bi bi-upload"></i> 投稿する
        </button>
      </form>
    </div>
  </div>

  <!-- プロンプト詳細モーダル -->
  <div id="promptDetailModal" class="post-modal">
    <div class="post-modal-content">
      <span class="close-btn" id="closePromptDetailModal">&times;</span>
      <h2 id="modalPromptTitle">プロンプト詳細</h2>
      <div class="modal-content-body">
        <div class="form-group">
          <label><strong>カテゴリ:</strong></label>
          <p id="modalPromptCategory"></p>
        </div>
        <div class="form-group">
          <label><strong>内容:</strong></label>
          <p id="modalPromptContent"></p>
        </div>
        <div class="form-group">
          <label><strong>投稿者:</strong></label>
          <p id="modalPromptAuthor"></p>
        </div>
        <div id="modalInputExamplesGroup" class="form-group" style="display: none;">
          <label><strong>入力例:</strong></label>
          <p id="modalInputExamples"></p>
        </div>
        <div id="modalOutputExamplesGroup" class="form-group" style="display: none;">
          <label><strong>出力例:</strong></label>
          <p id="modalOutputExamples"></p>
        </div>
      </div>
    </div>
  </div>

  <!-- 新規投稿ボタン -->
  <button id="openPostModal" class="new-prompt-btn" aria-label="新しいプロンプトを投稿">
    <i class="bi bi-plus-lg"></i>
  </button>

  <!-- メインのJavaScript -->
  
  <!-- 例: HTML の末尾に追加 -->
`;

export default function PromptSharePage() {
  useEffect(() => {
    import("../../scripts/entries/prompt_share");
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>プロンプト共有 - トップ</title>
        <link rel="icon" type="image/webp" href="/static/favicon.webp" />
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <link rel="stylesheet" href="/prompt_share/static/css/pages/prompt_share.bundle.css" />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: bodyMarkup }} />
    </>
  );
}
