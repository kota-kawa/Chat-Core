document.addEventListener("DOMContentLoaded", function () {

  const searchButton = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");
  const promptCardsSection = document.querySelector(".prompt-cards");
  const selectedCategoryTitle = document.getElementById("selected-category-title");

  // オリジナルの状態を保持しておく（検索クエリが空の場合に復元）
  const originalCardsHTML = promptCardsSection.innerHTML;
  const originalHeaderText = selectedCategoryTitle.textContent;

  const TITLE_CHAR_LIMIT = 17;
  const CONTENT_CHAR_LIMIT = 160;

  function truncateText(text, limit) {
    const safeText = text || '';
    const chars = Array.from(safeText);
    return chars.length > limit ? chars.slice(0, limit).join('') + '...' : safeText;
  }

  function truncateTitle(title) {
    return truncateText(title, TITLE_CHAR_LIMIT);
  }

  function truncateContent(content) {
    return truncateText(content, CONTENT_CHAR_LIMIT);
  }

  function searchPromptsServer() {
    const query = searchInput.value.trim();

    // クエリが空の場合は、オリジナルのカードとヘッダーを復元
    if (!query) {
      promptCardsSection.innerHTML = originalCardsHTML;
      selectedCategoryTitle.textContent = originalHeaderText;
      return;
    }

    // ヘッダーを更新して検索結果を上部に表示
    selectedCategoryTitle.textContent = `検索結果: 「${query}」`;

    fetch(`/search/prompts?q=${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // .prompt-cards 内をクリアして検索結果を表示
        promptCardsSection.innerHTML = "";
        if (data.prompts && data.prompts.length > 0) {
          data.prompts.forEach(prompt => {
            const card = document.createElement("div");
            card.classList.add("prompt-card");
            // カテゴリフィルタ用に data-category 属性を設定
            card.setAttribute("data-category", prompt.category);
            const truncatedContent = truncateContent(prompt.content);

            card.innerHTML = `
              <h3>${truncateTitle(prompt.title)}</h3>
              <p class="prompt-card__content">${truncatedContent}</p>
              <div class="prompt-meta">
                <span>カテゴリ: ${prompt.category}</span>
                <span>投稿者: ${prompt.author}</span>
              </div>
            `;
            card.dataset.fullTitle = prompt.title || '';
            card.dataset.fullContent = prompt.content || '';
            promptCardsSection.appendChild(card);
          });
        } else {
          promptCardsSection.innerHTML = "<p>該当するプロンプトが見つかりませんでした。</p>";
        }
      })
      .catch(err => {
        console.error("検索エラー:", err);
        promptCardsSection.innerHTML = `<p>エラーが発生しました: ${err.message}</p>`;
      });
  }

  searchButton.addEventListener("click", searchPromptsServer);
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPromptsServer();
    }
  });
});
