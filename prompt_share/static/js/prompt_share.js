document.addEventListener("DOMContentLoaded", function () {
  // ログイン状態の確認とUI切り替え
  const userIcon = document.getElementById('userIcon');
  const authButtons = document.getElementById('auth-buttons');

fetch('/api/current_user')
    .then(res => res.ok ? res.json() : { logged_in: false })
    
    .then(data => {
      if (data.logged_in) {
        if (authButtons) authButtons.style.display = 'none';
        if (userIcon) userIcon.style.display = '';
      } else {
        if (authButtons) authButtons.style.display = '';
        if (userIcon) userIcon.style.display = 'none';
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.onclick = () => { window.location.href = '/login'; };
      }
    })

   .catch(err => { // 修正後：catchブロックを一つにまとめ、エラー発生時もUIを非ログイン状態にフォールバックさせる
      console.error('Error checking login status:', err);
      if (authButtons) authButtons.style.display = '';
      if (userIcon) userIcon.style.display = 'none';
    });


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

            // サーバーから返却された各プロンプトに、ブックマーク状態を示すフィールド（bookmarked）があると仮定
            const isBookmarked = prompt.bookmarked;

            // ブックマーク状態に応じて、アイコンのHTMLを切り替える
            const bookmarkIcon = isBookmarked
              ? `<i class="bi bi-bookmark-fill"></i>`
              : `<i class="bi bi-bookmark"></i>`;


            const card = document.createElement("div");
            card.classList.add("prompt-card");
            // カテゴリフィルタ用に data-category 属性を設定
            card.setAttribute("data-category", prompt.category);

            // カード内で position: absolute; を使うため、相対配置を設定
            card.style.position = "relative";

            // カード内容を組み立て
            card.innerHTML = `
              <!-- ブックマークボタン：カード右上に固定 -->
                  <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" style="position: absolute; top: 10px; right: 10px; z-index: 2;">
                    ${bookmarkIcon}
                  </button>
              
              <h3>${prompt.title}</h3>
              <p>${prompt.content}</p>

              <!-- カテゴリと投稿者情報 ＋ （必要なら）トグルボタン＋ポップアップ -->
              <div class="prompt-meta" style="text-align: center; margin-top: 10px; position: relative;">
                <span>カテゴリ: ${prompt.category}</span>
                
                ${(prompt.input_examples || prompt.output_examples)
                ? `
                      <!-- トグルボタン。小さめのBootstrapボタンを利用 -->
                      <button class="toggle-guardrail btn btn-outline-success btn-sm" style="margin: 0 6px; padding: 2px 6px;">
                        <i class="bi bi-caret-down"></i>
                      </button>
              
                      <span>投稿者: ${prompt.author}</span>
              
                      <!-- 入出力例のポップアップ。カードの高さを変えないよう絶対配置 -->
                      <div class="guardrail-info" style="
                            display: none; 
                            position: absolute; 
                            bottom: 40px; 
                            left: 50%; 
                            transform: translateX(-50%);
                            background: #fff; 
                            border: 1px solid #ddd; 
                            border-radius: 4px; 
                            padding: 10px; 
                            width: 80%;
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                            z-index: 3;">
                        <strong>入力例:</strong> ${prompt.input_examples}<br>
                        <strong>出力例:</strong> ${prompt.output_examples}
                      </div>
                    `
                : `
                      <span style="margin-left: 6px;">投稿者: ${prompt.author}</span>
                    `
              }
              </div>
            `;


            // ブックマークボタンにクリックイベントを設定
            const bookmarkBtn = card.querySelector(".bookmark-btn");
            bookmarkBtn.addEventListener("click", function (e) {
              e.stopPropagation();
              // ブックマーク状態をトグル
              bookmarkBtn.classList.toggle("bookmarked");
              const isBookmarkedNow = bookmarkBtn.classList.contains("bookmarked");
              bookmarkBtn.innerHTML = isBookmarkedNow
                ? `<i class="bi bi-bookmark-fill"></i>`
                : `<i class="bi bi-bookmark"></i>`;
            
              if (isBookmarkedNow) {
                // ブックマーク追加（POSTリクエスト）
                fetch('/prompt_share/api/bookmark', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: prompt.title,
                    content: prompt.content,
                    input_examples: prompt.input_examples || "",
                    output_examples: prompt.output_examples || ""
                  })
                })
                  .then(response => response.json())
                  .then(result => {
                    if (result.error) {
                      console.error("ブックマーク保存エラー:", result.error);
                    } else {
                      console.log("ブックマークが保存されました:", result.message);
                    }
                  })
                  .catch(err => {
                    console.error("ブックマーク保存中にエラーが発生しました:", err);
                  });
              } else {
                // ブックマーク削除（DELETEリクエスト）
                fetch('/prompt_share/api/bookmark', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: prompt.title
                  })
                })
                  .then(response => response.json())
                  .then(result => {
                    if (result.error) {
                      console.error("ブックマーク削除エラー:", result.error);
                    } else {
                      console.log("ブックマークが削除されました:", result.message);
                    }
                  })
                  .catch(err => {
                    console.error("ブックマーク削除中にエラーが発生しました:", err);
                  });
              }
            });
            


            // 入力例または出力例がある場合、トグルボタンのクリックイベントを設定してポップアップ表示を切り替え
            if (prompt.input_examples || prompt.output_examples) {
              const toggleButton = card.querySelector(".toggle-guardrail");
              const guardrailInfo = card.querySelector(".guardrail-info");

              toggleButton.addEventListener("click", function (e) {
                e.stopPropagation();
                if (guardrailInfo.style.display === "none") {
                  guardrailInfo.style.display = "block";
                  toggleButton.innerHTML = '<i class="bi bi-caret-up"></i>';
                } else {
                  guardrailInfo.style.display = "none";
                  toggleButton.innerHTML = '<i class="bi bi-caret-down"></i>';
                }
              });
            }

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
    let input_examples = "";
    let output_examples = "";
    if (useGuardrail) {
      input_examples = document.getElementById("prompt-input-example").value;
      output_examples = document.getElementById("prompt-output-example").value;
    }


    // すべての投稿を公開するため、常に true に設定
    const isPublic = true;

    const postData = {
      title: title,
      category: category,
      content: content,
      author: author,
      input_examples: input_examples,
      output_examples: output_examples,
      is_public: isPublic
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



window.addEventListener('load', () => {
  const btn = document.querySelector('.new-prompt-btn');
  if (!btn) return;

  // ロード時の回転
  btn.classList.add('rotate-on-load');

  // （オプション）一定時間後にクラスを外すと、
  // 再度モーダルオープン時の回転に影響しません
  setTimeout(() => {
    btn.classList.remove('rotate-on-load');
  }, 1100); // CSSのtransition時間＋ちょっと余裕
});
