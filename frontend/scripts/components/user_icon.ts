// components/user_icon.ts
// ────────────────────────────────────────────────
// 右上ユーザーアイコン  +  ドロップダウンメニュー
//  - /api/user/profile で avatar_url / username を取得
//  - 取得失敗時はデフォルト画像・空文字にフォールバック
// ────────────────────────────────────────────────

const tpl = document.createElement("template");
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
    .btn[data-username]:not([data-username=""]):hover::after {
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
  private btn: HTMLButtonElement;
  private dropdown: HTMLDivElement;
  private avatarImg: HTMLImageElement;
  private _profileLoaded = false;
  private _handleAuthState: (evt?: Event) => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.append(tpl.content.cloneNode(true));

    const btn = root.querySelector(".btn") as HTMLButtonElement | null;
    const dropdown = root.querySelector(".dropdown") as HTMLDivElement | null;
    const avatarImg = root.querySelector(".avatar") as HTMLImageElement | null;

    if (!btn || !dropdown || !avatarImg) {
      throw new Error("user-icon template is missing required elements");
    }

    this.btn = btn;
    this.dropdown = dropdown;
    this.avatarImg = avatarImg;
    this._handleAuthState = this._handleAuthStateInternal.bind(this);

    // ドロップダウン開閉
    this.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dropdown.style.display =
        this.dropdown.style.display === "flex" ? "none" : "flex";
    });
    // 外側クリックで閉じる
    document.addEventListener("click", () => {
      this.dropdown.style.display = "none";
    });
  }

  connectedCallback() {
    document.addEventListener("authstatechange", this._handleAuthState);
    if (typeof window.loggedIn !== "undefined") {
      this._handleAuthStateInternal({ detail: { loggedIn: window.loggedIn } } as CustomEvent);
    }
  }

  disconnectedCallback() {
    document.removeEventListener("authstatechange", this._handleAuthState);
  }

  private _handleAuthStateInternal(evt?: Event) {
    const customEvent = evt as CustomEvent<{ loggedIn?: boolean }> | undefined;
    const loggedIn = Boolean(customEvent?.detail?.loggedIn);

    if (loggedIn) {
      if (!this._profileLoaded) {
        this.loadProfile();
      }
    } else {
      this._profileLoaded = false;
      this.dropdown.style.display = "none";
      this.avatarImg.src = "/static/user-icon.png";
      this.avatarImg.alt = "ユーザーアイコン";
      this.btn.removeAttribute("data-username");
    }
  }

  async loadProfile() {
    try {
      const res = await fetch("/api/user/profile", { credentials: "same-origin" });
      if (res.status === 401) {
        // 未ログイン時は静かに何もしない
        this._profileLoaded = false;
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();

      const avatar = data.avatar_url || "/static/user-icon.png";
      const name = typeof data.username === "string" ? data.username.trim() : "";

      this.avatarImg.src = avatar;
      // ツールチップにユーザー名（空文字時は非表示）
      if (name) {
        this.btn.setAttribute("data-username", name);
      } else {
        this.btn.removeAttribute("data-username");
      }
      // alt 属性にもセット
      this.avatarImg.alt = name ? `${name}のアイコン` : "ユーザーアイコン";
      this._profileLoaded = true;
    } catch (err) {
      console.warn("user_icon: profile load failed", err);
      this._profileLoaded = false;
    }
  }
}

if (!customElements.get("user-icon")) {
  customElements.define("user-icon", UserIcon);
}

export {};
