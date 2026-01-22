// chat_history.ts – 履歴のロード／保存
// --------------------------------------------------

/* サーバーから履歴取得 */
function loadChatHistory() {
  if (!window.currentChatRoomId) {
    if (window.chatMessages) window.chatMessages.innerHTML = "";
    return;
  }
  fetch(`/api/get_chat_history?room_id=${window.currentChatRoomId}`)
    .then((r) => r.json())
    .then((data) => {
      if (data.error) {
        console.error("get_chat_history:", data.error);
        return;
      }
      if (!window.chatMessages) return;
      window.chatMessages.innerHTML = "";
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      msgs.forEach((m: { message: string; sender: string }) => {
        if (window.displayMessage) window.displayMessage(m.message, m.sender);
      });

      if (window.chatMessages.lastElementChild && window.scrollMessageToTop)
        window.scrollMessageToTop(window.chatMessages.lastElementChild as HTMLElement);

      localStorage.setItem(
        `chatHistory_${window.currentChatRoomId}`,
        JSON.stringify(msgs.map((m: { message: string; sender: string }) => ({ text: m.message, sender: m.sender })))
      );
    })
    .catch((err) => console.error("履歴取得失敗:", err));
}

/* ローカルストレージから履歴読み込み */
function loadLocalChatHistory() {
  if (!window.currentChatRoomId || !window.chatMessages) return;
  const key = `chatHistory_${window.currentChatRoomId}`;
  let history: { text: string; sender: string }[] = [];
  try {
    const stored = localStorage.getItem(key);
    history = stored ? JSON.parse(stored) : [];
  } catch {
    history = [];
  }
  window.chatMessages.innerHTML = "";
  history.forEach((item) => {
    if (window.displayMessage) window.displayMessage(item.text, item.sender);
  });

  if (window.chatMessages.lastElementChild && window.scrollMessageToTop)
    window.scrollMessageToTop(window.chatMessages.lastElementChild as HTMLElement);
}

/* メッセージ1件をローカル保存 */
function saveMessageToLocalStorage(text: string, sender: string) {
  if (!window.currentChatRoomId) return;
  const key = `chatHistory_${window.currentChatRoomId}`;
  let history: { text: string; sender: string }[] = [];
  try {
    const stored = localStorage.getItem(key);
    history = stored ? JSON.parse(stored) : [];
  } catch {
    history = [];
  }
  history.push({ text, sender });
  localStorage.setItem(key, JSON.stringify(history));
}

// ---- window へ公開 ------------------------------
window.loadChatHistory = loadChatHistory;
window.loadLocalChatHistory = loadLocalChatHistory;
window.saveMessageToLocalStorage = saveMessageToLocalStorage;

export {};
