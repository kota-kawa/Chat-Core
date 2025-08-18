// chat_messages.js – メッセージ描画／コピー／ボットアニメ
// --------------------------------------------------
// ※ DOMPurify を必ず先にロードしておくこと
// <script src="https://unpkg.com/dompurify@2.4.0/dist/purify.min.js" defer></script>

////////////////////////////////////////////////////////////////////////////////
// メッセージ描画
////////////////////////////////////////////////////////////////////////////////

/* ユーザーメッセージを即時描画 */
function renderUserMessage(text) {
  const wrapper     = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';

  const msg = document.createElement('div');
  msg.className = 'user-message';

  // テキスト → <br> 置換後、<br> だけ許可してサニタイズ描画
  const htmlText = text.replace(/\n/g, '<br>');
  renderSanitizedHTML(msg, htmlText, ['br']);
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

    // 既存履歴は <br> が含まれているため、<br> だけ許可して描画
    if (text.includes('<')) {
      renderSanitizedHTML(msg, text, ['br']);
    } else {
      setTextWithLineBreaks(msg, text);
    }

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


// ---- window へ公開 ------------------------------
window.renderUserMessage = renderUserMessage;
window.animateBotMessage = animateBotMessage;
window.displayMessage    = displayMessage;

