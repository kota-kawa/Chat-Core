// chat_controller.ts – 送信ボタン／バックエンド通信
// --------------------------------------------------

/* 送信ボタン or Enter 押下 */
function sendMessage() {
  if (!window.userInput) return;
  const message = window.userInput.value.trim();
  if (!message) return;
  const aiModel = window.aiModelSelect ? window.aiModelSelect.value : "gemini-2.5-flash";
  window.showTypingIndicator?.();
  generateResponse(message, aiModel);
  window.userInput.value = "";
  window.userInput.style.height = "auto";
}

/* サーバー POST → Bot 応答を描画 */
function generateResponse(message: string, aiModel: string) {
  if (!window.chatMessages) return;
  // marked の遅延読み込みを先行して開始し、初回描画の崩れを減らす
  window.formatLLMOutput?.("");
  // ユーザーメッセージを即描画
  window.renderUserMessage?.(message);

  // Bot 側スピナー
  const spinnerWrap = document.createElement("div");
  spinnerWrap.className = "message-wrapper bot-message-wrapper";
  const spinner = document.createElement("div");
  spinner.className = "bot-message";
  spinner.innerHTML = '<div class="spinner"></div>';
  spinnerWrap.appendChild(spinner);

  window.chatMessages.appendChild(spinnerWrap);
  if (window.scrollMessageToBottom) {
    window.scrollMessageToBottom();
  } else if (window.scrollMessageToTop) {
    window.scrollMessageToTop(spinnerWrap);
  }

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      chat_room_id: window.currentChatRoomId,
      model: aiModel
    })
  })
    .then((r) => r.json())
    .then((data) => {
      window.hideTypingIndicator?.();
      spinnerWrap.remove();
      if (data && data.response) {
        window.animateBotMessage?.(data.response);
      } else if (data && data.error) {
        window.animateBotMessage?.("エラー: " + data.error);
      } else {
        window.animateBotMessage?.("エラー: 予期しないエラーが発生しました。");
      }
    })
    .catch((err) => {
      window.hideTypingIndicator?.();
      spinnerWrap.remove();
      window.animateBotMessage?.("エラー: " + err.toString());
    });
}

// ---- window へ公開 ------------------------------
window.sendMessage = sendMessage;
window.generateResponse = generateResponse;

export {};
