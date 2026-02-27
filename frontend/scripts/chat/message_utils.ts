// message_utils.ts – 共通メッセージユーティリティ
// --------------------------------------------------

// DOMPurify など外部ライブラリは先にロードされている想定

/**
 * HTML をサニタイズして挿入する
 * @param element   挿入先
 * @param dirtyHtml サニタイズ前 HTML
 * @param allowed   許可タグ（省略時はデフォルト）
 */
function renderSanitizedHTML(
  element: HTMLElement,
  dirtyHtml: string,
  allowed: string[] = [
    "a",
    "strong",
    "em",
    "code",
    "pre",
    "br",
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td"
  ]
) {
  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: allowed,
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target"]
  });
  element.innerHTML = clean;
}

/**
 * テキストを \n→<br> に変換しつつ安全に挿入
 * @param element
 * @param text
 */
function setTextWithLineBreaks(element: HTMLElement, text: string) {
  element.textContent = "";
  text.split("\n").forEach((line, idx, arr) => {
    element.appendChild(document.createTextNode(line));
    if (idx < arr.length - 1) element.appendChild(document.createElement("br"));
  });
}

// 新しいメッセージを表示領域の先頭に配置
function scrollMessageToTop(element: HTMLElement) {
  if (!window.chatMessages) return;
  const offset = -1050; // px, how far from the bottom the newest message should appear
  const max = window.chatMessages.scrollHeight - window.chatMessages.clientHeight;
  const target = Math.min(element.offsetTop, max) - offset;
  window.chatMessages.scrollTop = Math.max(target, 0);
}

// 汎用コピーアイコン
function createCopyBtn(getText: () => string) {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.innerHTML = '<i class="bi bi-clipboard"></i>';
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(getText()).then(() => {
      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(() => (btn.innerHTML = '<i class="bi bi-clipboard"></i>'), 2000);
    });
  });
  return btn;
}

// ---- window へ公開 ------------------------------
window.renderSanitizedHTML = renderSanitizedHTML;
window.setTextWithLineBreaks = setTextWithLineBreaks;
window.scrollMessageToTop = scrollMessageToTop;
window.createCopyBtn = createCopyBtn;

export {};
