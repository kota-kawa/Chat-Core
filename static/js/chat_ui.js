// chat_ui.js  – チャット画面 UI 共通ユーティリティ
// --------------------------------------------------

// グローバル初期化
window.currentChatRoomId = window.currentChatRoomId || null;

/* チャット画面を表示（セットアップ画面を隠す） */
function showChatInterface() {
  setupContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
  if (!currentChatRoomId && localStorage.getItem('currentChatRoomId')) {
    currentChatRoomId = localStorage.getItem('currentChatRoomId');
  }
}

/* タイピングインジケータ */
function showTypingIndicator() {
  typingIndicator.style.display = 'inline-flex';
}
function hideTypingIndicator() {
  typingIndicator.style.display = 'none';
}

/* LLM 出力を HTML 整形（**太字**／改行・箇条書き） */
function formatLLMOutput(text) {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  const lines = formatted.split('\n');
  let result = '';
  let inList = false;

  lines.forEach(line => {
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        result += '<ul>'; inList = true;
      }
      result += '<li>' + line.trim().substring(2) + '</li>';
    } else {
      if (inList) { result += '</ul>'; inList = false; }
      result += line + '<br>';
    }
  });
  if (inList) result += '</ul>';
  return result;
}


/*  サイドバートグル処理  */

function toggleSidebar(){
  const sb = document.querySelector('.sidebar');
  sb.classList.toggle('open');
  document.body.classList.toggle('sidebar-visible', sb.classList.contains('open'));
}
// ボタンクリックで開閉
document.addEventListener('DOMContentLoaded', ()=>{
  const sbBtn = document.getElementById('sidebar-toggle');
  if(sbBtn) sbBtn.addEventListener('click', e=>{
    e.stopPropagation();
    toggleSidebar();
  });
  // オーバーレイ／リンクタップで閉じる
  document.addEventListener('click', e=>{
    if(document.body.classList.contains('sidebar-visible') &&
       !e.target.closest('.sidebar') &&
       !e.target.closest('#sidebar-toggle')){
      toggleSidebar();
    }
  });
});



// ---- window へ公開 -------------------------------
window.showChatInterface = showChatInterface;
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.formatLLMOutput  = formatLLMOutput;
