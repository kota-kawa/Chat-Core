// my-spinner.js
const spinnerTemplate = document.createElement('template');
spinnerTemplate.innerHTML = `
  <style>
    .spinner-container {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .spinner {
      width: 80px;
      height: 80px;
      border: 8px solid transparent;
      border-top-color: #ff00ff;
      border-right-color: #00ffff;
      border-bottom-color: #ffff00;
      border-left-color: #ff0000;
      border-radius: 50%;
      animation: spin 1s linear infinite, hueShift 3s linear infinite;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes hueShift {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
  </style>
  <div class="spinner-container">
    <div class="spinner"></div>
  </div>
`;

export class MySpinner extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(spinnerTemplate.content.cloneNode(true));
  }

  // スピナーを表示するメソッド
  show() {
    this.shadowRoot.querySelector('.spinner-container').style.display = 'block';
  }

  // スピナーを非表示にするメソッド
  hide() {
    this.shadowRoot.querySelector('.spinner-container').style.display = 'none';
  }
}

customElements.define('my-spinner', MySpinner);
