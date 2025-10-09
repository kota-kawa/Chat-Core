// popup_menu.js
const template = document.createElement('template');
template.innerHTML = `
  <style>
    /* ============
       Reset / Base
       ============ */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ============
       Hidden Checkbox
       ============ */
    input[type="checkbox"] {
      display: none;
    }

    /* ============
       Common Button Styles
       ============ */
    .btn {
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
      position: relative;
    }
    .btn:hover {
      transform: scale(1.1);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }
    .btn svg {
      width: 24px;
      height: 24px;
      fill: #fff;
      transition: transform 0.3s ease;
    }

    /* ============
       Action Menu Wrapper
       ============ */
    .actions-menu {
      position: fixed;
      bottom: 40px;
      right: 40px;
      width: 60px;
      height: 60px;
      animation: popIn 0.6s ease;
      z-index: 9999;
    }

    :host([data-context="chat"]) .actions-menu {
      display: none;
    }

    @keyframes popIn {
      0% {
        transform: scale(0.5) rotate(0deg);
        opacity: 0;
      }
      80% {
        transform: scale(1.05) rotate(360deg);
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(360deg);
        opacity: 1;
      }
    }

    /* ============
       Menu Button (Large)
       ============ */
    .btn--menu {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #56ab2f, #a8e063);
      z-index: 1;
    }
    .btn--menu:after,
    .btn--menu:before,
    .btn--menu span {
      content: "";
      position: absolute;
      width: 25px;
      height: 3px;
      background: #fff;
      transition: transform 0.2s ease;
    }
    .btn--menu span {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .btn--menu:after {
      top: 50%;
      left: 50%;
      transform: translate(-50%, calc(-50% - 8px));
    }
    .btn--menu:before {
      top: 50%;
      left: 50%;
      transform: translate(-50%, calc(-50% + 8px));
    }

    /* ============
       Action Buttons
       ============ */
    .btn--share {
      background: linear-gradient(135deg, #3498db, #2980b9);
    }
    .btn--star {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
    }
    .btn--comment {
      background: linear-gradient(135deg, #f1c40f, #f39c12);
    }

    /* ============
       ボタンの配置
       ============ */
    .actions-menu .btn {
      position: absolute;
      top: 8px;
      left: 8px;
      opacity: 0;
      transform: scale(0) rotate(0deg);
    }
    .actions-menu .btn--menu {
      position: absolute;
      top: 0;
      left: 0;
      width: 60px;
      height: 60px;
      opacity: 1;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
      transform: none;
    }

    /* ============
       チェックが入ったら各アイコンが展開
       ============ */
    #actionMenuButton:checked + .actions-menu > .btn {
      opacity: 1;
      transform: scale(1) rotate(360deg);
      transition: all 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    /* 展開位置 */
    #actionMenuButton:checked + .actions-menu > .btn--share {
      top: -80px;
      left: 0px;
    }
    #actionMenuButton:checked + .actions-menu > .btn--star {
      top: -60px;
      left: -60px;
    }
    #actionMenuButton:checked + .actions-menu > .btn--comment {
      top: 0px;
      left: -80px;
    }

    /* ============
       ハンバーガー変形
       ============ */
    #actionMenuButton:checked + .actions-menu .btn--menu:after {
      transform: translate(-50%, -50%) rotate(45deg);
    }
    #actionMenuButton:checked + .actions-menu .btn--menu:before {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    #actionMenuButton:checked + .actions-menu .btn--menu span {
      transform: translate(-50%, -50%) scale(0);
    }

    /* ============
       ホバーアニメーション
       ============ */
    .btn--share:hover svg { transform: rotate(-20deg) scale(1.2); }
    .btn--star:hover svg  { transform: rotate(20deg)  scale(1.2); }
    .btn--comment:hover svg { transform: rotate(-20deg) scale(1.2); }
  
  
  /* スマホ表示時の調整（画面幅768px以下） - プロンプト投稿ボタンと同じサイズに */
    @media (max-width: 768px) {
      /* メニュー全体の位置とサイズ - プロンプト投稿ボタンと完全に同じサイズに */
      .actions-menu {
        bottom: 100px;  /* 入力フォームから十分離して配置 */
        right: 20px;    /* プロンプト投稿ボタンの位置に合わせて調整 */
        width: 56px;    /* プロンプト投稿ボタンと同じサイズに */
        height: 56px;   /* プロンプト投稿ボタンと同じサイズに */
      }
      /* ハンバーガーボタンをプロンプト投稿ボタンと完全に同じサイズに */
      .actions-menu .btn--menu {
        width: 56px !important;
        height: 56px !important;
      }
      /* 他のボタンのサイズ */
      .actions-menu .btn:not(.btn--menu) {
        width: 45px;
        height: 45px;
      }
      /* アイコンサイズ調整 */
      .btn svg {
        width: 20px;
        height: 20px;
      }
      
      /* チャット画面では入力フォームとの位置調整 */
      :host([data-context="chat"]) .actions-menu {
        bottom: 100px;  /* チャット入力フォームから十分離して配置 */
      }
    }

    /* 非常に小さな画面での調整（画面幅480px以下） - プロンプト投稿ボタンと完全に同じサイズに */
    @media (max-width: 480px) {
      /* メニュー全体のサイズをプロンプト投稿ボタンに完全に合わせて調整 */
      .actions-menu {
        bottom: 90px;   /* 入力フォームから十分離して配置 */
        right: 15px;    /* プロンプト投稿ボタンの位置に合わせて調整 */
        width: 50px;    /* プロンプト投稿ボタンと同じサイズに */
        height: 50px;   /* プロンプト投稿ボタンと同じサイズに */
      }
      /* ハンバーガーボタンをプロンプト投稿ボタンと完全に同じサイズに */
      .actions-menu .btn--menu {
        width: 50px !important;
        height: 50px !important;
      }
      /* 他のボタンのサイズをより小さく */
      .actions-menu .btn:not(.btn--menu) {
        width: 40px;
        height: 40px;
      }
      /* アイコンもさらに縮小 */
      .btn svg {
        width: 18px;
        height: 18px;
      }
      
      /* チャット画面では入力フォームとの位置調整 */
      :host([data-context="chat"]) .actions-menu {
        bottom: 90px;   /* チャット入力フォームから十分離して配置 */
      }
    }

    </style>

  <!-- チェックボックス（メニュー開閉用） -->
  <input type="checkbox" id="actionMenuButton" />

  <!-- アクションメニュー本体 -->
  <div class="actions-menu">
    <button class="btn btn--share" onclick="location.href='/prompt_share'" title="シェア">
      <svg viewBox="0 0 24 24">
        <path d="M21,11L14,4V8C7,9 4,14 3,19 C5.5,15.5 9,13.9 14,13.9V18L21,11Z" />
      </svg>
    </button>
    <button class="btn btn--star" onclick="location.href='/'" title="スター">
      <svg viewBox="0 0 24 24">
        <path d="M12,17.27L18.18,21L16.54,13.97 L22,9.24L14.81,8.62L12,2 L9.19,8.62L2,9.24L7.45,13.97 L5.82,21L12,17.27Z" />
      </svg>
    </button>
    <button class="btn btn--comment" onclick="location.href='/'"　title="コメント">
      <svg viewBox="0 0 24 24">
        <path d="M19,3A2,2 0 0,1 21,5V19 C21,20.11 20.1,21 19,21H5 A2,2 0 0,1 3,19V5 A2,2 0 0,1 5,3H19 M16.7,9.35 C16.92,9.14 16.92,8.79 16.7,8.58 L15.42,7.3 C15.21,7.08 14.86,7.08 14.65,7.3 L13.65,8.3 L15.7,10.35 L16.7,9.35 M7,14.94 V17 H9.06 L15.12,10.94 L13.06,8.88 L7,14.94Z" />
      </svg>
    </button>
    <label for="actionMenuButton" class="btn btn--menu"><span></span></label>
  </div>
`;

class ActionMenu extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    //  メニュー外クリックで自動クローズ
    const toggle = shadow.querySelector('#actionMenuButton');
    document.addEventListener('click', (e) => {
      // メニューが開いていて，クリック先がこのコンポーネント外なら閉じる
      if (toggle.checked && !e.composedPath().includes(this)) {
        toggle.checked = false;
      }
    });
    
    // チャット画面かどうかを検出して適切なサイズを適用
    this.updateMenuSize();
    // 画面の変化を監視
    this.observeScreenChanges();
  }
  
  updateMenuSize() {
    const chatContainer = document.getElementById('chat-container');
    const isInChatMode = chatContainer && 
      chatContainer.style.display === 'flex';
    
    // CSSカスタムプロパティでコンテキストを設定
    if (isInChatMode) {
      this.setAttribute('data-context', 'chat');
    } else {
      this.setAttribute('data-context', 'non-chat');
    }
  }
  
  observeScreenChanges() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      // MutationObserverでchat-containerのstyle変化を監視
      const observer = new MutationObserver(() => {
        this.updateMenuSize();
      });
      observer.observe(chatContainer, {
        attributes: true,
        attributeFilter: ['style']
      });
    }
    
    // 定期的にもチェック（念のため）
    setInterval(() => {
      this.updateMenuSize();
    }, 1000);
  }
}

customElements.define('action-menu', ActionMenu);
