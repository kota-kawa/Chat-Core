// static/js/web_components/user_icon.js

const userIconTemplate = document.createElement('template');
userIconTemplate.innerHTML = `
  <style>
    :host {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 9999;
      font-family: inherit;
    }
    .btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: background-color 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn:hover {
      background-color: rgba(0,0,0,0.05);
    }
    .user-icon-img {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .dropdown {
      position: absolute;
      top: 3rem;
      right: 0;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      min-width: 160px;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .dropdown a {
      padding: 0.6rem 1rem;
      text-decoration: none;
      color: #333;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dropdown a:hover {
      background-color: #f5f5f5;
    }
  </style>

  <button class="btn" title="ユーザー">
    <img src="/static/user-icon.png" alt="ユーザーアイコン" class="user-icon-img" />
  </button>
  <div class="dropdown">
    <a href="/settings">⚙️ 設定</a>
    <a href="/logout">🚪 ログアウト</a>
  </div>
`;

class UserIcon extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(userIconTemplate.content.cloneNode(true));

    this.btn = shadow.querySelector('.btn');
    this.dropdown = shadow.querySelector('.dropdown');

    // ボタンのクリックでドロップダウンを開閉
    this.btn.addEventListener('click', e => {
      e.stopPropagation();
      this.dropdown.style.display =
        this.dropdown.style.display === 'flex' ? 'none' : 'flex';
    });

    // 画面のどこかをクリックしたらドロップダウンを閉じる
    document.addEventListener('click', () => {
      this.dropdown.style.display = 'none';
    });
  }
}

customElements.define('user-icon', UserIcon);
