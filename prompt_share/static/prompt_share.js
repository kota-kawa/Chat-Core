document.addEventListener("DOMContentLoaded", function () {
  // ------------------------------
  // サーバーからプロンプト一覧を取得して表示する関数（Promise を返す）
  // ------------------------------
  function loadPrompts() {
    return fetch('/prompt_share/api/prompts')
      .then(response => response.json())
      .then(data => {
        const promptContainer = document.querySelector(".prompt-cards");
        promptContainer.innerHTML = ""; // 既存のカードをクリア
        if (data.prompts) {
          data.prompts.forEach(prompt => {
            const card = document.createElement("div");
            card.classList.add("prompt-card");
            // カテゴリフィルタ用に data-category 属性を設定
            card.setAttribute("data-category", prompt.category);
            card.innerHTML = `
              <button class="bookmark-btn"><i class="bi bi-bookmark"></i></button>
              <h3>${prompt.title}</h3>
              <p>${prompt.content}</p>
              ${ prompt.input_example ? `<div class="guardrail-info">
                <strong>入出力例:</strong> ${prompt.input_example}
              </div>` : '' }
              <div class="prompt-meta">
                <span>カテゴリ: ${prompt.category}</span>
                <span>投稿者: ${prompt.author}</span>
              </div>
            `;
            // ブックマークボタンの処理
            const bookmarkBtn = card.querySelector(".bookmark-btn");
            bookmarkBtn.addEventListener("click", function (e) {
              e.stopPropagation();
              bookmarkBtn.classList.toggle("bookmarked");
              bookmarkBtn.innerHTML = bookmarkBtn.classList.contains("bookmarked")
                ? `<i class="bi bi-bookmark-fill"></i>`
                : `<i class="bi bi-bookmark"></i>`;
            });
            promptContainer.appendChild(card);
          });
        }
      })
      .catch(err => console.error("プロンプト取得エラー:", err));
  }

  // 初回ロード時にプロンプト一覧を取得
  loadPrompts();

  // ------------------------------
  // 検索機能（サーバー側検索）
  // ------------------------------
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const promptCardsSection = document.querySelector(".prompt-cards");
  const selectedCategoryTitle = document.getElementById("selected-category-title");

  function searchPromptsServer() {
    const query = searchInput.value.trim();

    // クエリが空の場合は、全プロンプトを再表示
    if (!query) {
      loadPrompts();
      selectedCategoryTitle.textContent = "全てのプロンプト";
      return;
    }

    // ヘッダーを検索結果用に更新
    selectedCategoryTitle.textContent = `検索結果: 「${query}」`;

    fetch(`/search/prompts?q=${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        promptCardsSection.innerHTML = ""; // 既存のカードをクリア
        if (data.prompts && data.prompts.length > 0) {
          data.prompts.forEach(prompt => {
            const card = document.createElement("div");
            card.classList.add("prompt-card");
            card.setAttribute("data-category", prompt.category);
            card.innerHTML = `
              <h3>${prompt.title}</h3>
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

  // ------------------------------
  // カテゴリ選択と表示
  // ------------------------------
  const categoryCards = document.querySelectorAll(".category-card");
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      // 検索結果状態の場合は、検索入力をクリアし最新の全プロンプトを再取得
      if (searchInput.value.trim() !== "") {
        searchInput.value = "";
        loadPrompts().then(() => {
          applyCategoryFilter(card);
        });
      } else {
        applyCategoryFilter(card);
      }
    });
  });

  // カテゴリフィルタを適用する関数
  function applyCategoryFilter(card) {
    // 全カテゴリボタンの active クラスをリセット
    categoryCards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    const selectedCategory = card.getAttribute("data-category");
    selectedCategoryTitle.textContent =
      selectedCategory === "all"
        ? "全てのプロンプト"
        : `${selectedCategory} のプロンプト`;

    // 表示中のプロンプトカードにフィルタを適用
    const promptCards = document.querySelectorAll(".prompt-card");
    promptCards.forEach((prompt) => {
      const promptCategory = prompt.getAttribute("data-category");
      prompt.style.display =
        selectedCategory === "all" || promptCategory === selectedCategory
          ? "block"
          : "none";
    });
  }

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

    // ガードレール使用のチェックと値取得
    const useGuardrail = document.getElementById("guardrail-checkbox").checked;
    let prompt_example = "";
    if (useGuardrail) {
      prompt_example = document.getElementById("prompt_example").value;
    }
    const postData = {
      title: title,
      category: category,
      content: content,
      author: author,
      prompt_example: prompt_example
    };

    fetch('/prompt_share/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(result => {
      if (result.error) {
        alert("エラー: " + result.error);
      } else {
        alert("プロンプトが投稿されました！");
        // フォームリセット＆モーダルを閉じる
        postForm.reset();
        document.getElementById("guardrail-fields").style.display = "none";
        document.getElementById("postModal").classList.remove("show");
        // 最新のプロンプト一覧を再読み込み
        loadPrompts();
      }
    })
    .catch(err => {
      console.error("投稿エラー:", err);
      alert("プロンプト投稿中にエラーが発生しました。");
    });
  });

  // ------------------------------
  // 投稿モーダルの表示・非表示
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
  // ブックマーク機能（すでに存在するカードに対しても登録）
  // ------------------------------
  const promptCards = document.querySelectorAll(".prompt-card");
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
    guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
  });
});
