// static/js/components/user_icon.js
// ────────────────────────────────────────────────
// 右上ユーザーアイコン  +  ドロップダウンメニュー
//  - /api/user/profile で avatar_url / username を取得
//  - 取得失敗時はデフォルト画像・空文字にフォールバック
// ────────────────────────────────────────────────

const tpl = document.createElement('template');
tpl.innerHTML = `
  <style>
    :host {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      font-family: inherit;
      user-select: none;
    }
    .btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: .5rem;
      border-radius: 50%;
      transition: background-color .15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn:hover { background: rgba(0,0,0,.06); }
    .avatar {
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    /* ホバー時にユーザー名ツールチップ */
    .btn:hover::after {
      content: attr(data-username);
      position: absolute;
      top: 105%;
      right: 0;
      padding: .25rem .6rem;
      background: #333;
      color: #fff;
      font-size: .75rem;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
    }
    /* ▼ dropdown */
    .dropdown {
      position: absolute;
      top: 3rem;
      right: 0;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,.1);
      min-width: 160px;
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: fade .15s ease-out;
    }
    @keyframes fade { from { opacity: 0; transform: translateY(-5px);}
                      to   { opacity: 1; transform: translateY(0);} }
    .item {
      padding: .6rem 1rem;
      font-size: .9rem;
      text-decoration: none;
      color: #333;
      display: flex;
      align-items: center;
      gap: .5rem;
      cursor: pointer;
    }
    .item:hover { background: #f5f5f5; }
  </style>

  <button class="btn" title="ユーザー">
    <img class="avatar" src="/static/user-icon.png" alt="ユーザーアイコン">
  </button>

  <div class="dropdown">
    <a class="item" href="/settings">⚙️ 設定</a>
    <a class="item" href="/logout">🚪 ログアウト</a>
  </div>
`;

class UserIcon extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(tpl.content.cloneNode(true));

    this.btn       = this.shadowRoot.querySelector('.btn');
    this.dropdown  = this.shadowRoot.querySelector('.dropdown');
    this.avatarImg = this.shadowRoot.querySelector('.avatar');

    // ドロップダウン開閉
    this.btn.addEventListener('click', e => {
      e.stopPropagation();
      this.dropdown.style.display =
        this.dropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    // 外側クリックで閉じる
    document.addEventListener('click', () => { this.dropdown.style.display = 'none'; });
  }

  connectedCallback() { this.loadProfile(); }

  async loadProfile() {
    try {
      const res = await fetch('/api/user/profile', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();

      const avatar = data.avatar_url || '/static/user-icon.png';
      const name   = data.username   || '';

      this.avatarImg.src = avatar;
      // ツールチップにユーザー名
      this.btn.setAttribute('data-username', name);
      // alt 属性にもセット
      this.avatarImg.alt = name ? `${name}のアイコン` : 'ユーザーアイコン';
    } catch (err) {
      console.warn('user_icon: profile load failed', err);
    }
  }
}

customElements.define('user-icon', UserIcon);
