// tasks_name_update.js

export function updateTaskTitle(card, newTitle) {
  // ① card の直下にあるテキストノードをすべて削除
  Array.from(card.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.remove();
    }
  });
  
  // ② card 内の要素のうち、"delete-container"、"edit-container"、"task-title" 以外のものを削除
  Array.from(card.children).forEach(child => {
    if (!child.classList.contains('delete-container') &&
        !child.classList.contains('edit-container') &&
        !child.classList.contains('task-title')) {
      child.remove();
    }
  });
  
  // ③ "task-title" クラスの要素を探す。なければ新たに作成して card の先頭に追加
  let titleElem = card.querySelector('.task-title');
  if (!titleElem) {
    titleElem = document.createElement('span');
    titleElem.className = 'task-title';
    // card の computed style を取得し、フォント等のスタイルを反映して位置ずれを防ぐ
    const computedStyle = window.getComputedStyle(card);
    titleElem.style.font = computedStyle.font;
    titleElem.style.lineHeight = computedStyle.lineHeight;
    titleElem.style.display = 'inline';
    titleElem.style.margin = '0';
    titleElem.style.padding = '0';
    card.prepend(titleElem);
  }
  
  // ④ 新しいタスク名を表示
  titleElem.textContent = newTitle;
}
