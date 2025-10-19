document.addEventListener("DOMContentLoaded", function () {

  // ログイン状態の確認とUI切り替え
  const userIcon = document.getElementById('userIcon');
  const authButtons = document.getElementById('auth-buttons');
  let isLoggedIn = false; // ログイン状態を保持

  fetch('/api/current_user')
    .then(res => res.ok ? res.json() : { logged_in: false })
    .then(data => {
      isLoggedIn = data.logged_in;
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


  function closeAllDropdowns(exceptCard) {
    const openMenus = document.querySelectorAll('.prompt-actions-dropdown.is-open');
    openMenus.forEach(menu => {
      if (exceptCard && exceptCard.contains(menu)) {
        return;
      }
      menu.classList.remove('is-open');
      const trigger = menu.parentElement?.querySelector('.meatball-menu');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.addEventListener('click', () => closeAllDropdowns());


  function truncateTitle(title) {
    const chars = Array.from(title);
    return chars.length > 17 ? chars.slice(0, 17).join('') + '...' : title;
  }

  function createPromptCardElement(prompt) {
    const card = document.createElement("div");
    card.classList.add("prompt-card");
    if (prompt.category) {
      card.setAttribute("data-category", prompt.category);
    }

    const isBookmarked = Boolean(prompt.bookmarked);
    const bookmarkIcon = isBookmarked
      ? `<i class="bi bi-bookmark-fill"></i>`
      : `<i class="bi bi-bookmark"></i>`;

    card.innerHTML = `
      <button class="meatball-menu" type="button" aria-label="その他の操作" aria-haspopup="true" aria-expanded="false">
        <i class="bi bi-three-dots"></i>
      </button>

      <div class="prompt-actions-dropdown" role="menu">
        <button class="dropdown-item" type="button" role="menuitem">プロンプトリストに保存</button>
        <button class="dropdown-item" type="button" role="menuitem">ミュート</button>
        <button class="dropdown-item" type="button" role="menuitem">報告する</button>
      </div>

      <h3>${truncateTitle(prompt.title)}</h3>
      <p>${prompt.content}</p>

      <div class="prompt-meta">
        <div class="prompt-meta-info">
          <span>カテゴリ: ${prompt.category}</span>
          <span>投稿者: ${prompt.author}</span>
        </div>
        <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" type="button" aria-label="ブックマーク">
          ${bookmarkIcon}
        </button>
      </div>
    `;

    const bookmarkBtn = card.querySelector(".bookmark-btn");
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!isLoggedIn) {
          alert("ブックマークするにはログインが必要です。");
          return;
        }
        bookmarkBtn.classList.toggle("bookmarked");
        const isBookmarkedNow = bookmarkBtn.classList.contains("bookmarked");
        bookmarkBtn.innerHTML = isBookmarkedNow
          ? `<i class="bi bi-bookmark-fill"></i>`
          : `<i class="bi bi-bookmark"></i>`;

        if (isBookmarkedNow) {
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
      bookmarkBtn.dataset.bound = 'true';
    }

    const meatballBtn = card.querySelector(".meatball-menu");
    const dropdownMenu = card.querySelector('.prompt-actions-dropdown');
    if (meatballBtn && dropdownMenu) {
      meatballBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const willOpen = !dropdownMenu.classList.contains('is-open');
        closeAllDropdowns(card);
        dropdownMenu.classList.toggle('is-open', willOpen);
        meatballBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });

      dropdownMenu.addEventListener('click', (event) => {
        event.stopPropagation();
      });

      dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          dropdownMenu.classList.remove('is-open');
          meatballBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    card.addEventListener("click", function (e) {
      if (e.target.closest('.bookmark-btn') || e.target.closest('.meatball-menu')) {
        return;
      }
      closeAllDropdowns();
      showPromptDetailModal(prompt);
    });

    return card;
  }

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


            const card = createPromptCardElement(prompt);
            promptContainer.appendChild(card);
          });
        }
      })
      .catch(err => console.error("プロンプト取得エラー:", err));
  }



  // 初回ロード時にプロンプト一覧を取得
  loadPrompts();

  // ------------------------------
  // 静的プロンプトカードのイベントハンドラを追加（テスト用）
  // ------------------------------
  function setupStaticCardEvents() {
    const staticCards = document.querySelectorAll('.prompt-card');
    staticCards.forEach(card => {
      const meta = card.querySelector('.prompt-meta');
      if (meta && !meta.querySelector('.prompt-meta-info')) {
        const spans = Array.from(meta.querySelectorAll('span'));
        const metaInfo = document.createElement('div');
        metaInfo.classList.add('prompt-meta-info');
        spans.forEach(span => metaInfo.appendChild(span));
        meta.innerHTML = '';
        meta.appendChild(metaInfo);
      }

      const meatballBtn = card.querySelector('.meatball-menu');
      const dropdownMenu = card.querySelector('.prompt-actions-dropdown');
      if (meatballBtn && dropdownMenu) {
        meatballBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          const willOpen = !dropdownMenu.classList.contains('is-open');
          closeAllDropdowns(card);
          dropdownMenu.classList.toggle('is-open', willOpen);
          meatballBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });

        dropdownMenu.addEventListener('click', (event) => {
          event.stopPropagation();
        });

        dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
          item.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.remove('is-open');
            meatballBtn.setAttribute('aria-expanded', 'false');
          });
        });
      }

      const bookmarkBtn = card.querySelector('.bookmark-btn');
      if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!isLoggedIn) {
            alert('ブックマークするにはログインが必要です。');
            return;
          }
          bookmarkBtn.classList.toggle('bookmarked');
          bookmarkBtn.innerHTML = bookmarkBtn.classList.contains('bookmarked')
            ? `<i class="bi bi-bookmark-fill"></i>`
            : `<i class="bi bi-bookmark"></i>`;
        });
        bookmarkBtn.dataset.bound = 'true';
      }

      card.addEventListener('click', function(e) {
        // ブックマークボタンがあればそれは除外
        if (e.target.closest('.bookmark-btn') || e.target.closest('.meatball-menu')) {
          return;
        }

        // 静的カードのデータを取得
        const title = card.querySelector('h3').textContent;
        const content = card.querySelector('p').textContent;
        const category = card.getAttribute('data-category');
        const authorSpan = card.querySelector('.prompt-meta span:last-child');
        const author = authorSpan ? authorSpan.textContent.replace('投稿者: ', '') : '不明';
        
        // 模擬プロンプトデータを作成
        const mockPrompt = {
          title: title,
          content: content,
          category: category,
          author: author,
          input_examples: title === '告白のアドバイス' ? '好きな人に告白したいです。どのように気持ちを伝えればよいでしょうか？' : '',
          output_examples: title === '告白のアドバイス' ? '素直な気持ちで、相手のことを思いやりながら「あなたと一緒にいるととても幸せです。お付き合いしていただけませんか？」といった誠実な言葉で伝えることをお勧めします。' : ''
        };

        closeAllDropdowns();
        showPromptDetailModal(mockPrompt);
      });
    });
  }

  // 静的カードのイベントをセットアップ
  setupStaticCardEvents();

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
            const card = createPromptCardElement(prompt);
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
    if (!isLoggedIn) {
      alert("プロンプトを投稿するにはログインが必要です。");
      return;
    }
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
    const meta = card.querySelector(".prompt-meta");
    if (!meta) {
      return;
    }

    if (!meta.querySelector(".prompt-meta-info")) {
      const spans = Array.from(meta.querySelectorAll("span"));
      const metaInfo = document.createElement("div");
      metaInfo.classList.add("prompt-meta-info");
      spans.forEach(span => metaInfo.appendChild(span));
      meta.innerHTML = "";
      meta.appendChild(metaInfo);
    }

    let bookmarkBtn = meta.querySelector(".bookmark-btn");
    if (!bookmarkBtn) {
      bookmarkBtn = document.createElement("button");
      bookmarkBtn.classList.add("bookmark-btn");
      bookmarkBtn.setAttribute("type", "button");
      bookmarkBtn.setAttribute("aria-label", "ブックマーク");
      bookmarkBtn.innerHTML = `<i class="bi bi-bookmark"></i>`;
      meta.appendChild(bookmarkBtn);
    }

    if (bookmarkBtn.dataset.bound === 'true') {
      return;
    }

    bookmarkBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!isLoggedIn) {
        alert("ブックマークするにはログインが必要です。");
        return;
      }
      bookmarkBtn.classList.toggle("bookmarked");
      bookmarkBtn.innerHTML = bookmarkBtn.classList.contains("bookmarked")
        ? `<i class="bi bi-bookmark-fill"></i>`
        : `<i class="bi bi-bookmark"></i>`;
    });
    bookmarkBtn.dataset.bound = 'true';
  });



  // ------------------------------
  // ガードレールの表示切替処理
  // ------------------------------
  const guardrailCheckbox = document.getElementById("guardrail-checkbox");
  const guardrailFields = document.getElementById("guardrail-fields");

  guardrailCheckbox.addEventListener("change", function () {
    guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
  });


  // ------------------------------
  // プロンプト詳細モーダル機能
  // ------------------------------
  function showPromptDetailModal(prompt) {
    const modal = document.getElementById("promptDetailModal");
    const modalTitle = document.getElementById("modalPromptTitle");
    const modalCategory = document.getElementById("modalPromptCategory");
    const modalContent = document.getElementById("modalPromptContent");
    const modalAuthor = document.getElementById("modalPromptAuthor");
    const modalInputExamples = document.getElementById("modalInputExamples");
    const modalOutputExamples = document.getElementById("modalOutputExamples");
    const modalInputExamplesGroup = document.getElementById("modalInputExamplesGroup");
    const modalOutputExamplesGroup = document.getElementById("modalOutputExamplesGroup");

    // モーダルにデータを設定
    modalTitle.textContent = prompt.title;
    modalCategory.textContent = prompt.category;
    modalContent.textContent = prompt.content;
    modalAuthor.textContent = prompt.author;

    // 入力例・出力例がある場合のみ表示
    if (prompt.input_examples) {
      modalInputExamples.textContent = prompt.input_examples;
      modalInputExamplesGroup.style.display = "block";
    } else {
      modalInputExamplesGroup.style.display = "none";
    }

    if (prompt.output_examples) {
      modalOutputExamples.textContent = prompt.output_examples;
      modalOutputExamplesGroup.style.display = "block";
    } else {
      modalOutputExamplesGroup.style.display = "none";
    }

    // モーダルを表示
    modal.classList.add("show");
  }

  // モーダルを閉じる機能
  const promptDetailModal = document.getElementById("promptDetailModal");
  const closePromptDetailModalBtn = document.getElementById("closePromptDetailModal");

  // 閉じるボタンでモーダルを閉じる
  closePromptDetailModalBtn.addEventListener("click", function () {
    promptDetailModal.classList.remove("show");
  });

  // モーダル背景クリックで閉じる
  promptDetailModal.addEventListener("click", function (e) {
    if (e.target === promptDetailModal) {
      promptDetailModal.classList.remove("show");
    }
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
