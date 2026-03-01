// message_utils.ts – 共通メッセージユーティリティ
// --------------------------------------------------

// DOMPurify が利用可能な場合は使用し、未ロード時は安全なテキスト描画にフォールバック

/**
 * HTML をサニタイズして挿入する
 * @param element   挿入先
 * @param dirtyHtml サニタイズ前 HTML
 * @param allowed   許可タグ（省略時はデフォルト）
 */
function compactBotMessageHtml(html: string) {
  return html
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/<p>(?:\s|&nbsp;|&#160;|&#xA0;|&#8203;|&#x200b;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/(<\/(?:p|ul|ol|pre|blockquote|table|h[1-6])>\s*)(?:<br\s*\/?>\s*)+/gi, "$1")
    .replace(/(?:<br\s*\/?>\s*)+(<(?:p|ul|ol|pre|blockquote|table|h[1-6]|hr)\b)/gi, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSafeUrl(value: string) {
  const v = value.trim();
  if (!v) return false;
  return /^(https?:|mailto:|tel:|\/|#)/i.test(v);
}

function sanitizeHtmlWithoutPurifier(
  dirtyHtml: string,
  allowedTags: string[],
  allowedAttrs: string[]
) {
  const allowedTagSet = new Set(allowedTags.map((t) => t.toLowerCase()));
  const allowedAttrSet = new Set(allowedAttrs.map((a) => a.toLowerCase()));

  const template = document.createElement("template");
  template.innerHTML = dirtyHtml;

  const sanitizeNode = (node: Node): Node | DocumentFragment | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    // 非許可タグは中身だけ展開して残す
    if (!allowedTagSet.has(tag)) {
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => {
        const cleanedChild = sanitizeNode(child);
        if (cleanedChild) fragment.appendChild(cleanedChild);
      });
      return fragment;
    }

    const clean = document.createElement(tag);
    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (!allowedAttrSet.has(name)) return;

      if ((name === "href" || name === "src") && !isSafeUrl(value)) {
        return;
      }

      if (name === "target") {
        if (value === "_blank") {
          clean.setAttribute("target", "_blank");
          clean.setAttribute("rel", "noopener noreferrer");
        }
        return;
      }

      clean.setAttribute(name, value);
    });

    Array.from(element.childNodes).forEach((child) => {
      const cleanedChild = sanitizeNode(child);
      if (cleanedChild) clean.appendChild(cleanedChild);
    });

    return clean;
  };

  const root = document.createElement("div");
  Array.from(template.content.childNodes).forEach((child) => {
    const cleaned = sanitizeNode(child);
    if (cleaned) root.appendChild(cleaned);
  });

  return root.innerHTML;
}

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
    "td",
    "div",
    "span",
    "button",
    "i"
  ]
) {
  const isBotMessage = element.classList.contains("bot-message");
  const purifier = (globalThis as { DOMPurify?: { sanitize?: Function } }).DOMPurify;
  if (purifier && typeof purifier.sanitize === "function") {
    let clean = purifier.sanitize(dirtyHtml, {
      ALLOWED_TAGS: allowed,
      ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "class", "onclick"]
    });
    if (isBotMessage) {
      clean = compactBotMessageHtml(clean);
    }
    element.innerHTML = clean;
    return;
  }

  // サニタイザが未ロードでも許可タグだけを残すフォールバックサニタイズを適用する
  if (allowed.length === 1 && allowed[0] === "br") {
    setTextWithLineBreaks(element, dirtyHtml.replace(/<br\s*\/?>/gi, "\n"));
    return;
  }

  let clean = sanitizeHtmlWithoutPurifier(dirtyHtml, allowed, ["href", "src", "alt", "title", "target", "class", "onclick"]);
  if (isBotMessage) {
    clean = compactBotMessageHtml(clean);
  }
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
