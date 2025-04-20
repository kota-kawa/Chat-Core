// chat_messages.js – メッセージ描画／コピー／ボットアニメ
// --------------------------------------------------

/* ユーザーメッセージを即時描画 */
function renderUserMessage(text) {
  const wrapper     = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';

  const msg = document.createElement('div');
  msg.className = 'user-message';
  msg.innerHTML  = text.replace(/\n/g, '<br>');
  msg.style.animation = 'floatUp 0.5s ease-out';

  const copyBtn = createCopyBtn(() => text);

  wrapper.append(copyBtn, msg);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  saveMessageToLocalStorage(text.replace(/\n/g,'<br>'), 'user');
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

  let raw = '', idx = 0;
  const chunk = 7, interval = 100;
  const timer = setInterval(() => {
    if (idx >= originalText.length) {
      clearInterval(timer);
      msg.innerHTML = formatLLMOutput(raw);
      saveMessageToLocalStorage(raw, 'bot');
      return;
    }
    raw += originalText.substr(idx, chunk);
    idx += chunk;
    msg.innerHTML = formatLLMOutput(raw);
    msg.dataset.fullText = raw;
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    msg.innerHTML  = text;
    wrapper.append(copyBtn, msg);
  } else {
    wrapper.className = 'message-wrapper bot-message-wrapper';
    const msg = document.createElement('div');
    msg.className = 'bot-message';
    msg.innerHTML  = formatLLMOutput(text);
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
