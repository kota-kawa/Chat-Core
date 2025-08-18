// chat_history.js – 履歴のロード／保存
// --------------------------------------------------

import { chatMessages } from './dom.js';
import { displayMessage, scrollMessageToTop } from './chat_messages.js';
import { currentChatRoomId } from './chat_ui.js';

/* サーバーから履歴取得 */
export function loadChatHistory() {
  if (!currentChatRoomId) { chatMessages.innerHTML = ''; return; }
  fetch(`/api/get_chat_history?room_id=${currentChatRoomId}`)
    .then(r => r.json()).then(data => {
      if (data.error) { console.error("get_chat_history:", data.error); return; }
      chatMessages.innerHTML = '';
      const msgs = data.messages || [];
      msgs.forEach(m => displayMessage(m.message, m.sender));

      if (chatMessages.lastElementChild)
        scrollMessageToTop(chatMessages.lastElementChild);

      localStorage.setItem(
        `chatHistory_${currentChatRoomId}`,
        JSON.stringify(msgs.map(m => ({ text: m.message, sender: m.sender })))
      );
    }).catch(err => console.error("履歴取得失敗:", err));
}

/* ローカルストレージから履歴読み込み */
export function loadLocalChatHistory() {
  if (!currentChatRoomId) return;
  const key = `chatHistory_${currentChatRoomId}`;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key)) || []; }
  catch { history = []; }
  chatMessages.innerHTML = '';
  history.forEach(item => displayMessage(item.text, item.sender));

  if (chatMessages.lastElementChild)
    scrollMessageToTop(chatMessages.lastElementChild);

}

/* メッセージ1件をローカル保存 */
export function saveMessageToLocalStorage(text, sender) {
  if (!currentChatRoomId) return;
  const key = `chatHistory_${currentChatRoomId}`;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key)) || []; }
  catch { history = []; }
  history.push({ text, sender });
  localStorage.setItem(key, JSON.stringify(history));
}

