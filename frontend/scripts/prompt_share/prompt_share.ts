type PromptData = {
  id?: string | number;
  title: string;
  content: string;
  category?: string;
  author?: string;
  input_examples?: string;
  output_examples?: string;
  bookmarked?: boolean;
  saved_to_list?: boolean;
  created_at?: string;
};

function initPromptSharePage(attempt = 0) {
  const promptContainer = document.querySelector(".prompt-cards") as HTMLElement | null;
  if (!promptContainer) {
    if (attempt < 10) {
      requestAnimationFrame(() => initPromptSharePage(attempt + 1));
    }
    return;
  }
  if (promptContainer.dataset.psInitialized === "true") {
    return;
  }
  promptContainer.dataset.psInitialized = "true";

  // ログイン状態の確認とUI切り替え
  const userIcon = document.getElementById("userIcon");
  const authButtons = document.getElementById("auth-buttons");
  let isLoggedIn = false; // ログイン状態を保持

  fetch("/api/current_user")
    .then((res) => (res.ok ? res.json() : { logged_in: false }))
    .then((data) => {
      isLoggedIn = Boolean(data.logged_in);
      if (data.logged_in) {
        if (authButtons) authButtons.style.display = "none";
        if (userIcon) userIcon.style.display = "";
      } else {
        if (authButtons) authButtons.style.display = "";
        if (userIcon) userIcon.style.display = "none";
        const loginBtn = document.getElementById("login-btn");
        if (loginBtn) loginBtn.onclick = () => (window.location.href = "/login");
      }
    })
    .catch((err) => {
      console.error("Error checking login status:", err);
      if (authButtons) authButtons.style.display = "";
      if (userIcon) userIcon.style.display = "none";
    });

  function closeAllDropdowns(exceptCard?: HTMLElement | null) {
    const openMenus = document.querySelectorAll<HTMLElement>(".prompt-actions-dropdown.is-open");
    openMenus.forEach((menu) => {
      if (exceptCard && exceptCard.contains(menu)) {
        return;
      }
      menu.classList.remove("is-open");
      const trigger = menu.parentElement?.querySelector(".meatball-menu") as HTMLElement | null;
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
      const parentCard = menu.closest(".prompt-card");
      if (parentCard) {
        parentCard.classList.remove("menu-open");
      }
    });
  }

  if (document.body && document.body.dataset.psDropdownListener !== "true") {
    document.body.dataset.psDropdownListener = "true";
    document.addEventListener("click", () => closeAllDropdowns());
  }

  const TITLE_CHAR_LIMIT = 17;
  const CONTENT_CHAR_LIMIT = 160;

  function truncateText(text: string, limit: number) {
    const safeText = text || "";
    const chars = Array.from(safeText);
    return chars.length > limit ? chars.slice(0, limit).join("") + "..." : safeText;
  }

  function truncateTitle(title: string) {
    return truncateText(title, TITLE_CHAR_LIMIT);
  }

  function truncateContent(content: string) {
    return truncateText(content, CONTENT_CHAR_LIMIT);
  }

  function updateBookmarkButtonState(button: HTMLButtonElement | null, isBookmarked: boolean) {
    if (!button) return;
    button.classList.toggle("bookmarked", isBookmarked);
    button.innerHTML = isBookmarked
      ? `<i class="bi bi-bookmark-fill"></i>`
      : `<i class="bi bi-bookmark"></i>`;
  }

  function sendBookmarkRequest(method: "POST" | "DELETE", payload: Record<string, unknown>) {
    return fetch("/prompt_share/api/bookmark", {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        throw new Error(data.error || "操作に失敗しました。");
      }
      return data;
    });
  }

  function savePromptBookmark(prompt: PromptData) {
    return sendBookmarkRequest("POST", {
      title: prompt.title,
      content: prompt.content,
      input_examples: prompt.input_examples || "",
      output_examples: prompt.output_examples || ""
    });
  }

  function removePromptBookmark(prompt: PromptData) {
    return sendBookmarkRequest("DELETE", {
      title: prompt.title
    });
  }

  function savePromptToList(prompt: PromptData) {
    return fetch("/prompt_share/api/prompt_list", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_id: prompt.id ?? null,
        title: prompt.title,
        category: prompt.category || "",
        content: prompt.content,
        input_examples: prompt.input_examples || "",
        output_examples: prompt.output_examples || ""
      })
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        throw new Error(data.error || "操作に失敗しました。");
      }
      return data;
    });
  }

  function createPromptCardElement(prompt: PromptData) {
    const card = document.createElement("div");
    card.classList.add("prompt-card");
    if (prompt.category) {
      card.setAttribute("data-category", prompt.category);
    }

    const isBookmarked = Boolean(prompt.bookmarked);
    const isSavedToList = Boolean(prompt.saved_to_list);
    const bookmarkIcon = isBookmarked
      ? `<i class="bi bi-bookmark-fill"></i>`
      : `<i class="bi bi-bookmark"></i>`;

    const truncatedContent = truncateContent(prompt.content);

    card.innerHTML = `
      <button class="meatball-menu" type="button" aria-label="その他の操作" aria-haspopup="true" aria-expanded="false">
        <i class="bi bi-three-dots"></i>
      </button>

      <div class="prompt-actions-dropdown" role="menu">
        <button class="dropdown-item" type="button" role="menuitem" data-action="save-to-list">プロンプトリストに保存</button>
        <button class="dropdown-item" type="button" role="menuitem">ミュート</button>
        <button class="dropdown-item" type="button" role="menuitem">報告する</button>
      </div>

      <h3>${truncateTitle(prompt.title)}</h3>
      <p class="prompt-card__content">${truncatedContent}</p>

      <div class="prompt-meta">
        <div class="prompt-meta-info">
          <span>カテゴリ: ${prompt.category}</span>
          <span>投稿者: ${prompt.author}</span>
        </div>
        <div class="prompt-actions">
          <button class="prompt-action-btn comment-btn" type="button" aria-label="コメント">
            <i class="bi bi-chat-dots"></i>
          </button>
          <button class="prompt-action-btn like-btn" type="button" aria-label="いいね">
            <i class="bi bi-heart"></i>
          </button>
          <button class="prompt-action-btn bookmark-btn ${isBookmarked ? "bookmarked" : ""}" type="button" aria-label="ブックマーク">
            ${bookmarkIcon}
          </button>
        </div>
      </div>
    `;

    card.dataset.fullTitle = prompt.title || "";
    card.dataset.fullContent = prompt.content || "";
    card.dataset.savedToList = isSavedToList ? "true" : "false";
    card.dataset.psBound = "true";

    const bookmarkBtn = card.querySelector(".bookmark-btn") as HTMLButtonElement | null;
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!isLoggedIn) {
          alert("ブックマークするにはログインが必要です。");
          return;
        }

        const shouldBookmark = !bookmarkBtn.classList.contains("bookmarked");
        bookmarkBtn.disabled = true;

        const request = shouldBookmark ? savePromptBookmark(prompt) : removePromptBookmark(prompt);

        request
          .then((result) => {
            updateBookmarkButtonState(bookmarkBtn, shouldBookmark);
            prompt.bookmarked = shouldBookmark;
            if (result && result.message) {
              console.log(result.message);
            }
          })
          .catch((err) => {
            console.error("ブックマーク操作エラー:", err);
            alert("ブックマークの更新中にエラーが発生しました。");
          })
          .finally(() => {
            bookmarkBtn.disabled = false;
          });
      });
      bookmarkBtn.dataset.bound = "true";
    }

    const commentBtn = card.querySelector(".comment-btn") as HTMLButtonElement | null;
    if (commentBtn) {
      commentBtn.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    const likeBtn = card.querySelector(".like-btn") as HTMLButtonElement | null;
    if (likeBtn) {
      likeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        likeBtn.classList.toggle("liked");
        const icon = likeBtn.querySelector("i");
        if (icon) {
          icon.classList.toggle("bi-heart");
          icon.classList.toggle("bi-heart-fill");
        }
      });
    }

    const meatballBtn = card.querySelector(".meatball-menu") as HTMLButtonElement | null;
    const dropdownMenu = card.querySelector(".prompt-actions-dropdown") as HTMLElement | null;
    if (meatballBtn && dropdownMenu) {
      meatballBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const willOpen = !dropdownMenu.classList.contains("is-open");
        closeAllDropdowns(card);
        dropdownMenu.classList.toggle("is-open", willOpen);
        meatballBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        card.classList.toggle("menu-open", willOpen);
      });

      dropdownMenu.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      dropdownMenu.querySelectorAll<HTMLButtonElement>(".dropdown-item").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          dropdownMenu.classList.remove("is-open");
          meatballBtn.setAttribute("aria-expanded", "false");
          card.classList.remove("menu-open");
        });
      });

      const saveMenuItem = dropdownMenu.querySelector<HTMLButtonElement>('[data-action="save-to-list"]');
      if (saveMenuItem) {
        saveMenuItem.addEventListener("click", () => {
          if (!isLoggedIn) {
            alert("プロンプトを保存するにはログインが必要です。");
            return;
          }

          if (prompt.saved_to_list) {
            alert("このプロンプトはすでにプロンプトリストに保存されています。");
            return;
          }

          saveMenuItem.disabled = true;
          savePromptToList(prompt)
            .then((result) => {
              prompt.saved_to_list = true;
              card.dataset.savedToList = "true";
              if (result && result.message) {
                console.log(result.message);
              }
            })
            .catch((err) => {
              console.error("プロンプト保存中にエラーが発生しました:", err);
              alert("プロンプトリストへの保存中にエラーが発生しました。");
            })
            .finally(() => {
              saveMenuItem.disabled = false;
            });
        });
      }
    }

    card.addEventListener("click", function (e) {
      const target = e.target as Element | null;
      if (target?.closest(".prompt-action-btn") || target?.closest(".meatball-menu")) {
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
    return fetch("/prompt_share/api/prompts")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!promptContainer) {
          return;
        }
        promptContainer.innerHTML = ""; // 既存のカードをクリア

        if (data.prompts) {
          data.prompts.forEach((prompt: PromptData) => {
            prompt.bookmarked = Boolean(prompt.bookmarked);
            prompt.saved_to_list = Boolean(prompt.saved_to_list);
            const card = createPromptCardElement(prompt);
            promptContainer.appendChild(card);
          });
        } else {
          promptContainer.innerHTML = "<p>プロンプトが見つかりませんでした。</p>";
        }
      })
      .catch((err) => {
        console.error("プロンプト取得エラー:", err);
        if (promptContainer) {
          promptContainer.innerHTML = `<p>エラーが発生しました: ${err.message}</p>`;
        }
      });
  }

  // 初回ロード時にプロンプト一覧を取得
  loadPrompts();

  // ------------------------------
  // 静的プロンプトカードのイベントハンドラを追加（テスト用）
  // ------------------------------
  function setupStaticCardEvents() {
    const staticCards = document.querySelectorAll<HTMLElement>(".prompt-card");
    staticCards.forEach((card) => {
      if (card.dataset.psBound === "true") {
        return;
      }
      const titleElem = card.querySelector("h3");
      if (titleElem) {
        const fullTitle = titleElem.textContent || "";
        titleElem.dataset.fullTitle = fullTitle;
        titleElem.textContent = truncateTitle(fullTitle);
      }

      const contentElem = card.querySelector("p");
      if (contentElem) {
        const fullContent = contentElem.textContent || "";
        contentElem.dataset.fullContent = fullContent;
        contentElem.textContent = truncateContent(fullContent);
      }

      const meta = card.querySelector(".prompt-meta");
      if (meta && !meta.querySelector(".prompt-meta-info")) {
        const spans = Array.from(meta.querySelectorAll("span"));
        const metaInfo = document.createElement("div");
        metaInfo.classList.add("prompt-meta-info");
        spans.forEach((span) => metaInfo.appendChild(span));
        meta.innerHTML = "";
        meta.appendChild(metaInfo);
      }

      const commentBtn = card.querySelector(".comment-btn");
      if (commentBtn) {
        commentBtn.addEventListener("click", function (e) {
          e.stopPropagation();
        });
      }

      const likeBtn = card.querySelector(".like-btn");
      if (likeBtn) {
        likeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          likeBtn.classList.toggle("liked");
          const icon = likeBtn.querySelector("i");
          if (icon) {
            icon.classList.toggle("bi-heart");
            icon.classList.toggle("bi-heart-fill");
          }
        });
      }

      const meatballBtn = card.querySelector(".meatball-menu");
      const dropdownMenu = card.querySelector(".prompt-actions-dropdown");
      if (meatballBtn && dropdownMenu) {
        meatballBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          const willOpen = !dropdownMenu.classList.contains("is-open");
          closeAllDropdowns(card);
          dropdownMenu.classList.toggle("is-open", willOpen);
          meatballBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
          card.classList.toggle("menu-open", willOpen);
        });

        dropdownMenu.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        dropdownMenu.querySelectorAll(".dropdown-item").forEach((item) => {
          item.addEventListener("click", (event) => {
            event.stopPropagation();
            dropdownMenu.classList.remove("is-open");
            meatballBtn.setAttribute("aria-expanded", "false");
            card.classList.remove("menu-open");
          });
        });
      }

      const bookmarkBtn = card.querySelector(".bookmark-btn") as HTMLButtonElement | null;
      if (bookmarkBtn) {
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
        bookmarkBtn.dataset.bound = "true";
      }

      card.addEventListener("click", function (e) {
        const target = e.target as Element | null;
        if (target?.closest(".prompt-action-btn") || target?.closest(".meatball-menu")) {
          return;
        }

        // 静的カードのデータを取得
        const title = titleElem ? titleElem.dataset.fullTitle || titleElem.textContent || "" : "";
        const content = contentElem ? contentElem.dataset.fullContent || contentElem.textContent || "" : "";
        const category = card.getAttribute("data-category") || "";
        const authorSpan = card.querySelector(".prompt-meta span:last-child");
        const author = authorSpan ? authorSpan.textContent?.replace("投稿者: ", "") || "不明" : "不明";

        // 模擬プロンプトデータを作成
        const mockPrompt: PromptData = {
          title: title,
          content: content,
          category: category,
          author: author,
          input_examples:
            title === "告白のアドバイス"
              ? "好きな人に告白したいです。どのように気持ちを伝えればよいでしょうか？"
              : "",
          output_examples:
            title === "告白のアドバイス"
              ? "素直な気持ちで、相手のことを思いやりながら「あなたと一緒にいるととても幸せです。お付き合いしていただけませんか？」といった誠実な言葉で伝えることをお勧めします。"
              : ""
        };

        closeAllDropdowns();
        showPromptDetailModal(mockPrompt);
      });
      card.dataset.psBound = "true";
    });
  }

  // 静的カードのイベントをセットアップ
  setupStaticCardEvents();

  // ------------------------------
  // 検索機能（サーバー側検索）
  // ------------------------------
  const searchInput = document.getElementById("searchInput") as HTMLInputElement | null;
  const searchButton = document.getElementById("searchButton");
  const promptCardsSection = promptContainer;
  const selectedCategoryTitle = document.getElementById("selected-category-title");

  function searchPromptsServer() {
    if (!searchInput || !promptCardsSection || !selectedCategoryTitle) {
      return;
    }
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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        promptCardsSection.innerHTML = ""; // 既存のカードをクリア
        if (data.prompts && data.prompts.length > 0) {
          data.prompts.forEach((prompt: PromptData) => {
            const card = createPromptCardElement(prompt);
            promptCardsSection.appendChild(card);
          });
        } else {
          promptCardsSection.innerHTML = "<p>該当するプロンプトが見つかりませんでした。</p>";
        }
      })
      .catch((err) => {
        console.error("検索エラー:", err);
        promptCardsSection.innerHTML = `<p>エラーが発生しました: ${err.message}</p>`;
      });
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener("click", searchPromptsServer);
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        searchPromptsServer();
      }
    });
  }

  // ------------------------------
  // カテゴリ選択と表示
  // ------------------------------
  const categoryCards = document.querySelectorAll<HTMLElement>(".category-card");
  if (categoryCards.length > 0 && selectedCategoryTitle) {
    categoryCards.forEach((card) => {
      card.addEventListener("click", () => {
        // 検索結果状態の場合は、検索入力をクリアし最新の全プロンプトを再取得
        if (searchInput && searchInput.value.trim() !== "") {
          searchInput.value = "";
          loadPrompts().then(() => {
            applyCategoryFilter(card);
          });
        } else {
          applyCategoryFilter(card);
        }
      });
    });
  }

  // カテゴリフィルタを適用する関数
  function applyCategoryFilter(card: HTMLElement) {
    // 全カテゴリボタンの active クラスをリセット
    categoryCards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    const selectedCategory = card.getAttribute("data-category");
    selectedCategoryTitle!.textContent =
      selectedCategory === "all" ? "全てのプロンプト" : `${selectedCategory} のプロンプト`;

    // 表示中のプロンプトカードにフィルタを適用
    const promptCards = document.querySelectorAll<HTMLElement>(".prompt-card");
    promptCards.forEach((prompt) => {
      const promptCategory = prompt.getAttribute("data-category");
      prompt.style.display =
        selectedCategory === "all" || promptCategory === selectedCategory ? "block" : "none";
    });
  }

  // ------------------------------
  // 投稿フォームの送信処理
  // ------------------------------
  const postForm = document.getElementById("postForm") as HTMLFormElement | null;
  if (postForm) {
    postForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const titleInput = document.getElementById("prompt-title") as HTMLInputElement | null;
      const categoryInput = document.getElementById("prompt-category") as HTMLInputElement | null;
      const contentInput = document.getElementById("prompt-content") as HTMLTextAreaElement | null;
      const authorInput = document.getElementById("prompt-author") as HTMLInputElement | null;
      if (!titleInput || !categoryInput || !contentInput || !authorInput) {
        alert("フォーム要素が見つかりませんでした。ページを再読み込みしてください。");
        return;
      }

      const title = titleInput.value;
      const category = categoryInput.value;
      const content = contentInput.value;
      const author = authorInput.value;

      // ガードレール使用のチェックと値取得
      const guardrailCheckbox = document.getElementById("guardrail-checkbox") as HTMLInputElement | null;
      const useGuardrail = guardrailCheckbox ? guardrailCheckbox.checked : false;
      let input_examples = "";
      let output_examples = "";
      if (useGuardrail) {
        const inputExample = document.getElementById("prompt-input-example") as HTMLTextAreaElement | null;
        const outputExample = document.getElementById("prompt-output-example") as HTMLTextAreaElement | null;
        input_examples = inputExample ? inputExample.value : "";
        output_examples = outputExample ? outputExample.value : "";
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

      fetch("/prompt_share/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.error) {
            alert("エラー: " + result.error);
          } else {
            alert("プロンプトが投稿されました！");
            // フォームリセット＆モーダルを閉じる
            postForm.reset();
            const guardrailFields = document.getElementById("guardrail-fields");
            if (guardrailFields) {
              guardrailFields.style.display = "none";
            }
            const postModal = document.getElementById("postModal");
            if (postModal) {
              postModal.classList.remove("show");
            }
            triggerNewPromptIconRotation();
            // 最新のプロンプト一覧を再読み込み
            loadPrompts();
          }
        })
        .catch((err) => {
          console.error("投稿エラー:", err);
          alert("プロンプト投稿中にエラーが発生しました。");
        });
    });
  }

  // ------------------------------
  // 投稿モーダルの表示・非表示
  // ------------------------------
  const openModalBtn = document.getElementById("openPostModal");
  const postModal = document.getElementById("postModal");
  const closeModalBtn = document.querySelector(".close-btn");
  const newPromptIcon = openModalBtn ? openModalBtn.querySelector("i") : null;

  const triggerNewPromptIconRotation = () => {
    if (!newPromptIcon) {
      return;
    }
    newPromptIcon.classList.remove("rotating");
    void (newPromptIcon as HTMLElement).offsetWidth;
    newPromptIcon.classList.add("rotating");
  };

  if (newPromptIcon) {
    newPromptIcon.addEventListener("animationend", () => {
      newPromptIcon.classList.remove("rotating");
    });
  }

  if (openModalBtn && postModal) {
    openModalBtn.addEventListener("click", function () {
      if (!isLoggedIn) {
        alert("プロンプトを投稿するにはログインが必要です。");
        return;
      }

      triggerNewPromptIconRotation();

      postModal.classList.add("show");
    });
  }

  if (closeModalBtn && postModal) {
    closeModalBtn.addEventListener("click", function () {
      postModal.classList.remove("show");
      triggerNewPromptIconRotation();
    });
  }

  if (postModal && postModal.dataset.psWindowListener !== "true") {
    postModal.dataset.psWindowListener = "true";
    window.addEventListener("click", function (event) {
      if (event.target === postModal) {
        postModal.classList.remove("show");
        triggerNewPromptIconRotation();
      }
    });
  }

  // ------------------------------
  // ブックマーク機能（すでに存在するカードに対しても登録）
  // ------------------------------
  const promptCards = document.querySelectorAll<HTMLElement>(".prompt-card");
  promptCards.forEach((card) => {
    const meta = card.querySelector(".prompt-meta");
    if (!meta) {
      return;
    }

    if (!meta.querySelector(".prompt-meta-info")) {
      const spans = Array.from(meta.querySelectorAll("span"));
      const metaInfo = document.createElement("div");
      metaInfo.classList.add("prompt-meta-info");
      spans.forEach((span) => metaInfo.appendChild(span));
      meta.innerHTML = "";
      meta.appendChild(metaInfo);
    }

    let bookmarkBtn = meta.querySelector(".bookmark-btn") as HTMLButtonElement | null;
    if (!bookmarkBtn) {
      bookmarkBtn = document.createElement("button");
      bookmarkBtn.classList.add("bookmark-btn");
      bookmarkBtn.setAttribute("type", "button");
      bookmarkBtn.setAttribute("aria-label", "ブックマーク");
      bookmarkBtn.innerHTML = `<i class="bi bi-bookmark"></i>`;
      meta.appendChild(bookmarkBtn);
    }

    if (bookmarkBtn.dataset.bound === "true") {
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
    bookmarkBtn.dataset.bound = "true";
  });

  // ------------------------------
  // ガードレールの表示切替処理
  // ------------------------------
  const guardrailCheckbox = document.getElementById("guardrail-checkbox") as HTMLInputElement | null;
  const guardrailFields = document.getElementById("guardrail-fields");

  if (guardrailCheckbox && guardrailFields) {
    guardrailCheckbox.addEventListener("change", function () {
      guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
    });
  }

  // ------------------------------
  // プロンプト詳細モーダル機能
  // ------------------------------
  function showPromptDetailModal(prompt: PromptData) {
    const modal = document.getElementById("promptDetailModal");
    const modalTitle = document.getElementById("modalPromptTitle");
    const modalCategory = document.getElementById("modalPromptCategory");
    const modalContent = document.getElementById("modalPromptContent");
    const modalAuthor = document.getElementById("modalPromptAuthor");
    const modalInputExamples = document.getElementById("modalInputExamples");
    const modalOutputExamples = document.getElementById("modalOutputExamples");
    const modalInputExamplesGroup = document.getElementById("modalInputExamplesGroup");
    const modalOutputExamplesGroup = document.getElementById("modalOutputExamplesGroup");

    if (!modal || !modalTitle || !modalCategory || !modalContent || !modalAuthor) return;

    // モーダルにデータを設定
    modalTitle.textContent = prompt.title;
    modalCategory.textContent = prompt.category || "";
    modalContent.textContent = prompt.content;
    modalAuthor.textContent = prompt.author || "";

    // 入力例・出力例がある場合のみ表示
    if (prompt.input_examples && modalInputExamples && modalInputExamplesGroup) {
      modalInputExamples.textContent = prompt.input_examples;
      modalInputExamplesGroup.style.display = "block";
    } else if (modalInputExamplesGroup) {
      modalInputExamplesGroup.style.display = "none";
    }

    if (prompt.output_examples && modalOutputExamples && modalOutputExamplesGroup) {
      modalOutputExamples.textContent = prompt.output_examples;
      modalOutputExamplesGroup.style.display = "block";
    } else if (modalOutputExamplesGroup) {
      modalOutputExamplesGroup.style.display = "none";
    }

    // モーダルを表示
    modal.classList.add("show");
  }

  // モーダルを閉じる機能
  const promptDetailModal = document.getElementById("promptDetailModal");
  const closePromptDetailModalBtn = document.getElementById("closePromptDetailModal");

  // 閉じるボタンでモーダルを閉じる
  if (closePromptDetailModalBtn && promptDetailModal) {
    closePromptDetailModalBtn.addEventListener("click", function () {
      promptDetailModal.classList.remove("show");
    });
  }

  // モーダル背景クリックで閉じる
  if (promptDetailModal) {
    promptDetailModal.addEventListener("click", function (e) {
      if (e.target === promptDetailModal) {
        promptDetailModal.classList.remove("show");
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initPromptSharePage());
} else {
  initPromptSharePage();
}

export {};
