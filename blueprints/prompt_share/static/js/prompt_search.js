document.addEventListener("DOMContentLoaded", function () {

  const searchButton = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");
  const promptCardsSection = document.querySelector(".prompt-cards");
  const selectedCategoryTitle = document.getElementById("selected-category-title");

  // オリジナルの状態を保持しておく（検索クエリが空の場合に復元）
  const originalCardsHTML = promptCardsSection.innerHTML;
  const originalHeaderText = selectedCategoryTitle.textContent;

  function truncateTitle(title) {
    const chars = Array.from(title);
    return chars.length > 17 ? chars.slice(0, 17).join('') + '...' : title;
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
            card.innerHTML = `
              <h3>${truncateTitle(prompt.title)}</h3>
              <p>${prompt.content}</p>
              <div class="prompt-meta">
                <span>カテゴリ: ${prompt.category}</span>
                <span>投稿者: ${prompt.author}</span>
              </div>
            `;
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
