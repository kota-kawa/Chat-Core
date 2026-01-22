// chat_ui.ts  – チャット画面 UI 共通ユーティリティ
// --------------------------------------------------

// グローバル初期化
window.currentChatRoomId = window.currentChatRoomId || null;

/* チャット画面を表示（セットアップ画面を隠す） */
function showChatInterface() {
  if (!window.setupContainer || !window.chatContainer) return;
  window.setupContainer.style.display = "none";
  window.chatContainer.style.display = "flex";
  if (!window.currentChatRoomId && localStorage.getItem("currentChatRoomId")) {
    window.currentChatRoomId = localStorage.getItem("currentChatRoomId");
  }
}

/* タイピングインジケータ */
function showTypingIndicator() {
  if (!window.typingIndicator) return;
  window.typingIndicator.style.display = "inline-flex";
}
function hideTypingIndicator() {
  if (!window.typingIndicator) return;
  window.typingIndicator.style.display = "none";
}

/* LLM 出力を HTML 整形（**太字**／改行・箇条書き） */
function formatLLMOutput(text: string) {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const lines = formatted.split("\n");
  let result = "";
  let inList = false;

  lines.forEach((line) => {
    if (line.trim().startsWith("- ")) {
      if (!inList) {
        result += "<ul>";
        inList = true;
      }
      result += "<li>" + line.trim().substring(2) + "</li>";
    } else {
      if (inList) {
        result += "</ul>";
        inList = false;
      }
      result += line + "<br>";
    }
  });
  if (inList) result += "</ul>";
  return result;
}

/*  サイドバートグル処理  */
function toggleSidebar() {
  const sb = document.querySelector(".sidebar");
  if (!sb) return;
  sb.classList.toggle("open");
  document.body.classList.toggle("sidebar-visible", sb.classList.contains("open"));
}

const initSidebarToggle = () => {
  const sbBtn = document.getElementById("sidebar-toggle");
  if (sbBtn)
    sbBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  // オーバーレイ／リンクタップで閉じる
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (
      document.body.classList.contains("sidebar-visible") &&
      target &&
      !target.closest(".sidebar") &&
      !target.closest("#sidebar-toggle")
    ) {
      toggleSidebar();
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebarToggle);
} else {
  initSidebarToggle();
}

// ---- window へ公開 -------------------------------
window.showChatInterface = showChatInterface;
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.formatLLMOutput = formatLLMOutput;

export {};
