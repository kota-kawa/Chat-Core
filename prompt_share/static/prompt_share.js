document.addEventListener("DOMContentLoaded", function () {
  // ------------------------------
  // カテゴリ選択と表示
  // ------------------------------
  const categoryCards = document.querySelectorAll(".category-card");
  const promptCards = document.querySelectorAll(".prompt-card");
  const selectedCategoryTitle = document.getElementById("selected-category-title");

  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      categoryCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");

      const selectedCategory = card.getAttribute("data-category");
      selectedCategoryTitle.textContent =
        selectedCategory === "all"
          ? "全てのプロンプト"
          : selectedCategory + " のプロンプト";

      promptCards.forEach((prompt) => {
        const promptCategory = prompt.getAttribute("data-category");
        prompt.style.display =
          selectedCategory === "all" || promptCategory === selectedCategory
            ? "block"
            : "none";
      });
    });
  });

  // ------------------------------
  // 投稿モーダル表示・非表示（フェードイン）
  // ------------------------------
  const openModalBtn = document.getElementById("openPostModal");
  const postModal = document.getElementById("postModal");
  const closeModalBtn = document.querySelector(".close-btn");

  openModalBtn.addEventListener("click", function () {
    postModal.classList.add("show");
  });

  closeModalBtn.addEventListener("click", function () {
    postModal.classList.remove("show");
  });

  window.addEventListener("click", function (event) {
    if (event.target === postModal) {
      postModal.classList.remove("show");
    }
  });

  // ------------------------------
  // ブックマーク機能
  // ------------------------------
  promptCards.forEach((card) => {
    if (!card.querySelector(".bookmark-btn")) {
      const bookmarkBtn = document.createElement("button");
      bookmarkBtn.classList.add("bookmark-btn");
      bookmarkBtn.innerHTML = `<i class="bi bi-bookmark"></i>`;
      card.prepend(bookmarkBtn);

      bookmarkBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        bookmarkBtn.classList.toggle("bookmarked");
        bookmarkBtn.innerHTML = bookmarkBtn.classList.contains("bookmarked")
          ? `<i class="bi bi-bookmark-fill"></i>`
          : `<i class="bi bi-bookmark"></i>`;
      });
    }
  });

  // ------------------------------
  // ガードレールの表示切替処理
  // ------------------------------
  const guardrailCheckbox = document.getElementById("guardrail-checkbox");
  const guardrailFields = document.getElementById("guardrail-fields");

  guardrailCheckbox.addEventListener("change", function () {
    if (guardrailCheckbox.checked) {
      guardrailFields.style.display = "block";
    } else {
      guardrailFields.style.display = "none";
    }
  });

  // ------------------------------
  // 投稿フォームの送信処理
  // ------------------------------
  const postForm = document.getElementById("postForm");
  postForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("prompt-title").value;
    const category = document.getElementById("prompt-category").value;
    const content = document.getElementById("prompt-content").value;
    const author = document.getElementById("prompt-author").value;

    // ガードレールの使用有無と追加フィールドの値取得
    const useGuardrail = guardrailCheckbox.checked;
    let inputExample = "";
    let outputExample = "";
    if (useGuardrail) {
      inputExample = document.getElementById("prompt-input-example").value;
      outputExample = document.getElementById("prompt-output-example").value;
    }

    // 新規プロンプトカード生成（ガードレール情報も含む）
    const newCard = document.createElement("div");
    newCard.classList.add("prompt-card");
    newCard.setAttribute("data-category", category);
    newCard.innerHTML = `
      <button class="bookmark-btn"><i class="bi bi-bookmark"></i></button>
      <h3>${title}</h3>
      <p>${content}</p>
      ${useGuardrail ? `<div class="guardrail-info">
        <strong>入力例:</strong> ${inputExample}<br>
        <strong>出力例:</strong> ${outputExample}
      </div>` : ''}
      <div class="prompt-meta">
        <span>カテゴリ: ${category}</span>
        <span>投稿者: ${author}</span>
      </div>
    `;

    const newBookmarkBtn = newCard.querySelector(".bookmark-btn");
    newBookmarkBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      newBookmarkBtn.classList.toggle("bookmarked");
      newBookmarkBtn.innerHTML = newBookmarkBtn.classList.contains("bookmarked")
        ? `<i class="bi bi-bookmark-fill"></i>`
        : `<i class="bi bi-bookmark"></i>`;
    });

    document.querySelector(".prompt-cards").appendChild(newCard);
    postForm.reset();
    guardrailFields.style.display = "none"; // リセット時は非表示に戻す
    postModal.classList.remove("show");
  });

  // ------------------------------
  // 検索機能
  // ------------------------------
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");

  function searchPrompts() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      const activeCategory = document.querySelector(".category-card.active");
      if (activeCategory) {
        activeCategory.click();
      }
      return;
    }
    categoryCards.forEach((c) => c.classList.remove("active"));
    document.querySelector('.category-card[data-category="all"]').classList.add("active");
    selectedCategoryTitle.textContent = `検索結果: 「${query}」`;

    promptCards.forEach((prompt) => {
      const text = prompt.innerText.toLowerCase();
      prompt.style.display = text.includes(query) ? "block" : "none";
    });
  }

  searchButton.addEventListener("click", searchPrompts);

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPrompts();
    }
  });
});
