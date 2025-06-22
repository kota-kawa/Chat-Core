// chat_messages.js – メッセージ描画／コピー／ボットアニメ
// --------------------------------------------------
// XSS 対策: DOMPurify を利用するため、事前に
// <script src="https://unpkg.com/dompurify@2.4.0/dist/purify.min.js"></script>
// を HTML 側で読み込んでおくこと。

/* ---------- 追加: ユーティリティ ---------- */

/**
 * 信頼できる HTML 文字列をサニタイズして挿入する
 * @param {HTMLElement} element
 * @param {string} dirtyHtml
 */
function renderSanitizedHTML(element, dirtyHtml) {
  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS : [
      'a','strong','em','code','pre','br',
      'p','ul','ol','li','blockquote','img'
    ],
    ALLOWED_ATTR : ['href','src','alt','title','target']
  });
  element.innerHTML = clean;
}

/**
 * テキストを安全に挿入し、\n を <br> に置換
 * @param {HTMLElement} element
 * @param {string} text
 */
function setTextWithLineBreaks(element, text) {
  element.textContent = '';
  text.split('\n').forEach((line, idx, arr) => {
    element.appendChild(document.createTextNode(line));
    if (idx < arr.length - 1) element.appendChild(document.createElement('br'));
  });
}

// 新しいメッセージを表示領域の先頭に配置
function scrollMessageToTop(element) {
  const max = chatMessages.scrollHeight - chatMessages.clientHeight;
  chatMessages.scrollTop = Math.min(element.offsetTop, max);
}

/* ---------- メッセージ描画 ---------- */

/* ユーザーメッセージを即時描画 */
function renderUserMessage(text) {
  const wrapper     = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';

  const msg = document.createElement('div');
  msg.className = 'user-message';
  setTextWithLineBreaks(msg, text);

  msg.style.animation = 'floatUp 0.5s ease-out';

  const copyBtn = createCopyBtn(() => text);

  wrapper.append(copyBtn, msg);
  chatMessages.appendChild(wrapper);
  scrollMessageToTop(wrapper);

  saveMessageToLocalStorage(text, 'user');
}

/* Bot メッセージをタイプアニメーションで描画 */
function animateBotMessage(originalText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper bot-message-wrapper';

  const msg = document.createElement('div');
  msg.className = 'bot-message';

  const copyBtn = createCopyBtn(() => msg.dataset.fullText || '');
  wrapper.append(copyBtn, msg);
  chatMessages.appendChild(wrapper);
  scrollMessageToTop(wrapper);

  let raw = '', idx = 0;
  const chunk = 7, interval = 100;
  const timer = setInterval(() => {
    if (idx >= originalText.length) {
      clearInterval(timer);
      renderSanitizedHTML(msg, formatLLMOutput(raw));
      saveMessageToLocalStorage(raw, 'bot');
      return;
    }
    raw += originalText.substr(idx, chunk);
    idx += chunk;
    renderSanitizedHTML(msg, formatLLMOutput(raw));
    msg.dataset.fullText = raw;
  }, interval);
}

/* ローカル／サーバ履歴共通描画 */
function displayMessage(text, sender) {
  const wrapper = document.createElement('div');
  const copyBtn = createCopyBtn(() => text);

  if (sender === 'user') {
    wrapper.className = 'message-wrapper user-message-wrapper';
    const msg = document.createElement('div');
    msg.className = 'user-message';
    // 旧: msg.innerHTML = text;
    setTextWithLineBreaks(msg, text);
    wrapper.append(copyBtn, msg);
  } else {
    wrapper.className = 'message-wrapper bot-message-wrapper';
    const msg = document.createElement('div');
    msg.className = 'bot-message';
 
    renderSanitizedHTML(msg, formatLLMOutput(text));
    wrapper.append(copyBtn, msg);
  }
  chatMessages.appendChild(wrapper);
}

/* 汎用コピーアイコン */
function createCopyBtn(getText) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.innerHTML = '<i class="bi bi-clipboard"></i>';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(getText()).then(() => {
      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
    });
  });
  return btn;
}

// ---- window へ公開 ------------------------------
window.renderUserMessage   = renderUserMessage;
window.animateBotMessage   = animateBotMessage;
window.displayMessage      = displayMessage;
window.scrollMessageToTop  = scrollMessageToTop;
