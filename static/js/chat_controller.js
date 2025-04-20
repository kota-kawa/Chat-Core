// chat_controller.js – 送信ボタン／バックエンド通信
// --------------------------------------------------

/* 送信ボタン or Enter 押下 */
function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  const aiModel = aiModelSelect.value;
  showTypingIndicator();
  generateResponse(message, aiModel);
  userInput.value = '';
  userInput.style.height = 'auto';
}

/* サーバー POST → Bot 応答を描画 */
function generateResponse(message, aiModel) {

  // ユーザーメッセージを即描画
  renderUserMessage(message);

  // Bot 側スピナー
  const spinnerWrap = document.createElement('div');
  spinnerWrap.className = 'message-wrapper bot-message-wrapper';
  const spinner = document.createElement('div');
  spinner.className = 'bot-message';
  spinner.innerHTML = '<div class="spinner"></div>';
  spinnerWrap.appendChild(spinner);
  chatMessages.appendChild(spinnerWrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  fetch('/api/chat',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      message, chat_room_id: currentChatRoomId, model: aiModel
    })
  })
  .then(r=>r.json())
  .then(data=>{
    hideTypingIndicator();
    spinnerWrap.remove();
    if (data.response) animateBotMessage(data.response);
    else animateBotMessage("エラー: "+data.error);
  })
  .catch(err=>{
    hideTypingIndicator(); spinnerWrap.remove();
    animateBotMessage("エラー: "+err.toString());
  });
}

// ---- window へ公開 ------------------------------
window.sendMessage      = sendMessage;
window.generateResponse = generateResponse;
