// chat_messages.js – メッセージ描画／コピー／ボットアニメ
// --------------------------------------------------
// ※ DOMPurify を必ず先にロードしておくこと
// <script src="https://unpkg.com/dompurify@2.4.0/dist/purify.min.js" defer></script>

////////////////////////////////////////////////////////////////////////////////
// 1. 便利関数
////////////////////////////////////////////////////////////////////////////////

/**
 * HTML をサニタイズして挿入する
 * @param {HTMLElement} element   挿入先
 * @param {string}      dirtyHtml サニタイズ前 HTML
 * @param {string[]}    allowed   許可タグ（省略時はデフォルト）
 */
function renderSanitizedHTML(element, dirtyHtml, allowed = [
  'a','strong','em','code','pre','br','p','ul','ol','li','blockquote','img'
]) {
  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS : allowed,
    ALLOWED_ATTR : ['href','src','alt','title','target']
  });
  element.innerHTML = clean;
}

/**
 * テキストを \n→<br> に変換しつつ安全に挿入
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
  const offset = -1050; // px, how far from the bottom the newest message should appear
  const max = chatMessages.scrollHeight - chatMessages.clientHeight;
  const target = Math.min(element.offsetTop, max) - offset;
  chatMessages.scrollTop = Math.max(target, 0);
}

////////////////////////////////////////////////////////////////////////////////
// 2. メッセージ描画
////////////////////////////////////////////////////////////////////////////////

/* ユーザーメッセージを即時描画 */
function renderUserMessage(text) {
  const wrapper     = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';

  const msg = document.createElement('div');
  msg.className = 'user-message';

  // ----- 変更前 ------------------------------------------------------------
  // msg.innerHTML = text.replace(/\n/g, '<br>');
  // ------------------------------------------------------------------------

  // ----- 変更後 ------------------------------------------------------------
  // テキスト → <br> 置換後、<br> だけ許可してサニタイズ描画
  const htmlText = text.replace(/\n/g, '<br>');
  renderSanitizedHTML(msg, htmlText, ['br']);
  // ------------------------------------------------------------------------

  msg.style.animation = 'floatUp 0.5s ease-out';

  const copyBtn = createCopyBtn(() => text);


  wrapper.append(copyBtn, msg);
  chatMessages.appendChild(wrapper);
  scrollMessageToTop(wrapper);


  // ローカル保存は <br> 付き HTML で互換維持
  saveMessageToLocalStorage(htmlText, 'user');
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

      // ----- 変更前 --------------------------------------------------------
      // msg.innerHTML = formatLLMOutput(raw);
      // --------------------------------------------------------------------

      // ----- 変更後 --------------------------------------------------------
      renderSanitizedHTML(msg, formatLLMOutput(raw));
      // --------------------------------------------------------------------

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

    // ----- 変更前 --------------------------------------------------------
    // setTextWithLineBreaks(msg, text);
    // --------------------------------------------------------------------

    // ----- 変更後 --------------------------------------------------------
    // 既存履歴は <br> が含まれているため、<br> だけ許可して描画
    if (text.includes('<')) {
      renderSanitizedHTML(msg, text, ['br']);
    } else {
      setTextWithLineBreaks(msg, text);
    }
    // --------------------------------------------------------------------

    wrapper.append(copyBtn, msg);
  } else {
    wrapper.className = 'message-wrapper bot-message-wrapper';
    const msg = document.createElement('div');
    msg.className = 'bot-message';

    // Bot はマークアップ済み → 広めのタグ許可でサニタイズ
    renderSanitizedHTML(msg, formatLLMOutput(text));
    wrapper.append(copyBtn, msg);

  }
  chatMessages.appendChild(wrapper);
}


////////////////////////////////////////////////////////////////////////////////
// 3. 汎用コピーアイコン
////////////////////////////////////////////////////////////////////////////////

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

