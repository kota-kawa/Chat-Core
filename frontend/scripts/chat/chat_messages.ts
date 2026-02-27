// chat_messages.ts – メッセージ描画／コピー／ボットアニメ
// --------------------------------------------------
// ※ DOMPurify を必ず先にロードしておくこと
// <script src="https://unpkg.com/dompurify@2.4.0/dist/purify.min.js" defer></script>

////////////////////////////////////////////////////////////////////////////////
// メッセージ描画
////////////////////////////////////////////////////////////////////////////////

/* ユーザーメッセージを即時描画 */
function renderUserMessage(text: string) {
  if (!window.chatMessages) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper user-message-wrapper";

  const msg = document.createElement("div");
  msg.className = "user-message";

  // テキスト → <br> 置換後、<br> だけ許可してサニタイズ描画
  const htmlText = text.replace(/\n/g, "<br>");
  window.renderSanitizedHTML?.(msg, htmlText, ["br"]);
  msg.style.animation = "floatUp 0.5s ease-out";

  const copyBtn = window.createCopyBtn ? window.createCopyBtn(() => text) : document.createElement("button");

  wrapper.append(copyBtn, msg);
  window.chatMessages.appendChild(wrapper);
  if (window.scrollMessageToTop) window.scrollMessageToTop(wrapper);

  // ローカル保存は <br> 付き HTML で互換維持
  if (window.saveMessageToLocalStorage) window.saveMessageToLocalStorage(htmlText, "user");
}

/* Bot メッセージをタイプアニメーションで描画 */
function animateBotMessage(originalText: string) {
  if (!window.chatMessages) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot-message-wrapper";

  const msg = document.createElement("div");
  msg.className = "bot-message";

  const copyBtn = window.createCopyBtn ? window.createCopyBtn(() => msg.dataset.fullText || "") : document.createElement("button");
  wrapper.append(copyBtn, msg);
  window.chatMessages.appendChild(wrapper);
  if (window.scrollMessageToTop) window.scrollMessageToTop(wrapper);

  let raw = "";
  let idx = 0;
  const chunk = 7;
  const typingInterval = 100;
  const formatInterval = 2000;
  let needsRender = false;

  const renderMarkdown = () => {
    if (!needsRender) return;
    if (window.renderSanitizedHTML && window.formatLLMOutput) {
      window.renderSanitizedHTML(msg, window.formatLLMOutput(raw));
    } else {
      window.setTextWithLineBreaks?.(msg, raw);
    }
    needsRender = false;
  };

  const formatTimer = setInterval(() => {
    renderMarkdown();
  }, formatInterval);

  const typingTimer = setInterval(() => {
    if (idx >= originalText.length) {
      clearInterval(typingTimer);
      clearInterval(formatTimer);
      renderMarkdown();

      if (window.saveMessageToLocalStorage) window.saveMessageToLocalStorage(raw, "bot");
      return;
    }
    raw += originalText.substr(idx, chunk);
    idx += chunk;
    msg.dataset.fullText = raw;
    needsRender = true;

    // 最初の表示だけは即時に行い、以降は2秒ごとの整形更新に任せる
    if (idx <= chunk) renderMarkdown();
  }, typingInterval);
}

/* ローカル／サーバ履歴共通描画 */
function displayMessage(text: string, sender: string) {
  if (!window.chatMessages) return;
  const wrapper = document.createElement("div");
  const copyBtn = window.createCopyBtn ? window.createCopyBtn(() => text) : document.createElement("button");

  if (sender === "user") {
    wrapper.className = "message-wrapper user-message-wrapper";
    const msg = document.createElement("div");
    msg.className = "user-message";

    // 既存履歴は <br> が含まれているため、<br> だけ許可して描画
    if (text.includes("<")) {
      window.renderSanitizedHTML?.(msg, text, ["br"]);
    } else {
      window.setTextWithLineBreaks?.(msg, text);
    }

    wrapper.append(copyBtn, msg);
  } else {
    wrapper.className = "message-wrapper bot-message-wrapper";
    const msg = document.createElement("div");
    msg.className = "bot-message";

    // Bot はマークアップ済み → 広めのタグ許可でサニタイズ
    if (window.renderSanitizedHTML && window.formatLLMOutput) {
      window.renderSanitizedHTML(msg, window.formatLLMOutput(text));
    }
    wrapper.append(copyBtn, msg);
  }
  window.chatMessages.appendChild(wrapper);
}

// ---- window へ公開 ------------------------------
window.renderUserMessage = renderUserMessage;
window.animateBotMessage = animateBotMessage;
window.displayMessage = displayMessage;

export {};
