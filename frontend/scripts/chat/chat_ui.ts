// chat_ui.ts  – チャット画面 UI 共通ユーティリティ
// --------------------------------------------------

let markedParser: ((text: string, options?: Record<string, unknown>) => string | Promise<string>) | null = null;
let markedLoadPromise: Promise<void> | null = null;

function normalizeMarkdownSegmentForDisplay(segment: string) {
  return segment
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t\u3000]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function normalizeLLMTextForDisplay(rawText: string) {
  const normalized = rawText.replace(/\r\n?/g, "\n");
  const codeFencePattern = /```[\s\S]*?```/g;
  let result = "";
  let lastIndex = 0;

  for (const match of normalized.matchAll(codeFencePattern)) {
    const matchStart = match.index ?? 0;
    const matchText = match[0] || "";

    result += normalizeMarkdownSegmentForDisplay(normalized.slice(lastIndex, matchStart));
    result += matchText;
    lastIndex = matchStart + matchText.length;
  }

  result += normalizeMarkdownSegmentForDisplay(normalized.slice(lastIndex));
  return result;
}

function ensureMarkedParser() {
  if (markedParser) return Promise.resolve();
  if (markedLoadPromise) return markedLoadPromise;

  markedLoadPromise = import("marked")
    .then((module) => {
      markedParser = module.marked.parse.bind(module.marked);
    })
    .catch((error) => {
      console.error("Failed to load marked parser:", error);
    })
    .finally(() => {
      markedLoadPromise = null;
    });

  return markedLoadPromise;
}

// グローバル初期化
window.currentChatRoomId = window.currentChatRoomId || null;

/* チャット画面を表示（セットアップ画面を隠す） */
function showChatInterface() {
  if (!window.setupContainer || !window.chatContainer) return;
  window.setupContainer.style.display = "none";
  window.chatContainer.style.display = "flex";

  // Markdown パーサはチャット画面表示時に遅延読み込みする
  void ensureMarkedParser();

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

/* LLM 出力の Markdown を HTML に変換 */
function formatLLMOutput(text: string) {
  const normalized = normalizeLLMTextForDisplay(text);
  if (!markedParser) {
    void ensureMarkedParser();
    return normalized;
  }

  const parsed = markedParser(normalized, {
    async: false,
    gfm: true,
    breaks: true
  });
  return typeof parsed === "string" ? parsed : normalized;
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
