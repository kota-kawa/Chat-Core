// popup_menu.js (chat-specific)
const chatTemplate = document.createElement('template');
chatTemplate.innerHTML = `
  <style>
    :host {
      display: contents;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    input[type="checkbox"] {
      display: none;
    }

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

    .actions-menu {
      position: fixed;
      bottom: 40px;
      right: 40px;
      width: 60px;
      height: 60px;
      animation: popIn 0.6s ease;
      z-index: 9999;
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

    .btn--share {
      background: linear-gradient(135deg, #3498db, #2980b9);
    }
    .btn--star {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
    }
    .btn--comment {
      background: linear-gradient(135deg, #f1c40f, #f39c12);
    }

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

    #chatActionMenuButton:checked + .actions-menu > .btn {
      opacity: 1;
      transform: scale(1) rotate(360deg);
      transition: all 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    #chatActionMenuButton:checked + .actions-menu > .btn--share {
      top: -80px;
      left: 0px;
    }
    #chatActionMenuButton:checked + .actions-menu > .btn--star {
      top: -60px;
      left: -60px;
    }
    #chatActionMenuButton:checked + .actions-menu > .btn--comment {
      top: 0px;
      left: -80px;
    }

    #chatActionMenuButton:checked + .actions-menu .btn--menu:after {
      transform: translate(-50%, -50%) rotate(45deg);
    }
    #chatActionMenuButton:checked + .actions-menu .btn--menu:before {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    #chatActionMenuButton:checked + .actions-menu .btn--menu span {
      transform: translate(-50%, -50%) scale(0);
    }

    .btn--share:hover svg { transform: rotate(-20deg) scale(1.2); }
    .btn--star:hover svg  { transform: rotate(20deg)  scale(1.2); }
    .btn--comment:hover svg { transform: rotate(-20deg) scale(1.2); }

    @media (max-width: 768px) {
      .actions-menu {
        bottom: 100px;
        right: 20px;
        width: 56px;
        height: 56px;
      }
      .actions-menu .btn--menu {
        width: 56px !important;
        height: 56px !important;
      }
      .actions-menu .btn:not(.btn--menu) {
        width: 45px;
        height: 45px;
      }
      .btn svg {
        width: 20px;
        height: 20px;
      }
    }

    @media (max-width: 480px) {
      .actions-menu {
        bottom: 90px;
        right: 15px;
        width: 50px;
        height: 50px;
      }
      .actions-menu .btn--menu {
        width: 50px !important;
        height: 50px !important;
      }
      .actions-menu .btn:not(.btn--menu) {
        width: 40px;
        height: 40px;
      }
      .btn svg {
        width: 18px;
        height: 18px;
      }
    }
  </style>

  <input type="checkbox" id="chatActionMenuButton" />
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
    <button class="btn btn--comment" onclick="location.href='/memo'" title="メモ">
      <svg viewBox="0 0 24 24">
        <path d="M19,3A2,2 0 0,1 21,5V19 C21,20.11 20.1,21 19,21H5 A2,2 0 0,1 3,19V5 A2,2 0 0,1 5,3H19 M16.7,9.35 C16.92,9.14 16.92,8.79 16.7,8.58 L15.42,7.3 C15.21,7.08 14.86,7.08 14.65,7.3 L13.65,8.3 L15.7,10.35 L16.7,9.35 M7,14.94 V17 H9.06 L15.12,10.94 L13.06,8.88 L7,14.94Z" />
      </svg>
    </button>
    <label for="chatActionMenuButton" class="btn btn--menu"><span></span></label>
  </div>
`;

class ChatActionMenu extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(chatTemplate.content.cloneNode(true));

    const toggle = shadow.querySelector('#chatActionMenuButton');
    document.addEventListener('click', (event) => {
      if (toggle.checked && !event.composedPath().includes(this)) {
        toggle.checked = false;
      }
    });
  }
}

customElements.define('chat-action-menu', ChatActionMenu);
