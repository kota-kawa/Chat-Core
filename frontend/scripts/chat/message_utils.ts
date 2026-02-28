// message_utils.ts – 共通メッセージユーティリティ
// --------------------------------------------------

// DOMPurify が利用可能な場合は使用し、未ロード時は安全なテキスト描画にフォールバック

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
  const purifier = (globalThis as { DOMPurify?: { sanitize?: Function } }).DOMPurify;
  if (purifier && typeof purifier.sanitize === "function") {
    const clean = purifier.sanitize(dirtyHtml, {
      ALLOWED_TAGS: allowed,
      ALLOWED_ATTR: ["href", "src", "alt", "title", "target"]
    });
    element.innerHTML = clean;
    return;
  }

  // サニタイザが未ロードの間は、HTMLを解釈せずテキストとして描画する
  if (allowed.length === 1 && allowed[0] === "br") {
    setTextWithLineBreaks(element, dirtyHtml.replace(/<br\s*\/?>/gi, "\n"));
    return;
  }

  const tmp = document.createElement("div");
  tmp.innerHTML = dirtyHtml;
  setTextWithLineBreaks(element, tmp.textContent || "");
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

// 新しいメッセージを常に表示領域の末尾へ追従
function scrollMessageToBottom() {
  if (!window.chatMessages) return;
  window.chatMessages.scrollTop = window.chatMessages.scrollHeight;
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
// 既存呼び出し互換のために旧名も残す
window.scrollMessageToBottom = scrollMessageToBottom;
window.scrollMessageToTop = scrollMessageToBottom;
window.createCopyBtn = createCopyBtn;

export {};
