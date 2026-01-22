function initNewPromptModal() {
  const openModalBtn = document.getElementById("openNewPromptModal") as HTMLButtonElement | null;
  const plusIcon = openModalBtn?.querySelector(".bi-plus-lg") as HTMLElement | null;
  const newPromptModal = document.getElementById("newPromptModal");
  const modalCloseBtn = document.getElementById("newModalCloseBtn");
  const guardrailCheckbox = document.getElementById("new-guardrail-checkbox") as HTMLInputElement | null;
  const guardrailFields = document.getElementById("new-guardrail-fields");
  const newPostForm = document.getElementById("newPostForm") as HTMLFormElement | null;

  const togglePlusRotation = (isRotated: boolean, options: { animate?: boolean } = {}) => {
    if (!openModalBtn) return;

    const { animate = true } = options;

    if (!animate && plusIcon) {
      plusIcon.classList.add("no-transition");
      openModalBtn.classList.toggle("is-rotated", Boolean(isRotated));

      requestAnimationFrame(() => {
        plusIcon.classList.remove("no-transition");
      });
      return;
    }

    openModalBtn.classList.toggle("is-rotated", Boolean(isRotated));
  };

  const closeModal = (options: { skipRotation?: boolean; animateRotation?: boolean } = {}) => {
    if (!newPromptModal) return;
    newPromptModal.classList.remove("show");

    if (options.skipRotation) {
      if (openModalBtn) {
        openModalBtn.classList.remove("is-rotated");
      }
      return;
    }

    togglePlusRotation(false, { animate: Boolean(options.animateRotation) });
  };

  const openModal = (options?: { animateRotation?: boolean }) => {
    if (!newPromptModal) return;
    newPromptModal.classList.add("show");
    togglePlusRotation(true, { animate: Boolean(options?.animateRotation) });
  };

  // 初期表示では回転アニメーションを発火させない
  if (newPromptModal?.classList.contains("show")) {
    closeModal({ skipRotation: true });
  } else if (openModalBtn) {
    openModalBtn.classList.remove("is-rotated");
  }

  // ＋ボタンを押すとモーダル表示
  if (openModalBtn && newPromptModal) {
    openModalBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (newPromptModal.classList.contains("show")) {
        closeModal({ animateRotation: true });
      } else {
        openModal({ animateRotation: true });
      }
    });
  }

  // 閉じるボタンでモーダルを閉じる
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });
  }

  // モーダル背景クリックで閉じる
  if (newPromptModal) {
    newPromptModal.addEventListener("click", function (e) {
      if (e.target === newPromptModal) {
        closeModal();
      }
    });
  }

  // ガードレールチェックボックスで入出力例部分の表示切替
  if (guardrailCheckbox && guardrailFields) {
    guardrailCheckbox.addEventListener("change", function () {
      guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
    });
  }

  // モーダル内フォームの送信
  if (newPostForm) {
    newPostForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const titleInput = document.getElementById("new-prompt-title") as HTMLInputElement | null;
      const contentInput = document.getElementById("new-prompt-content") as HTMLTextAreaElement | null;
      if (!titleInput || !contentInput) {
        alert("入力欄が見つかりませんでした。");
        return;
      }

      // 各入力項目の値を取得
      const title = titleInput.value;
      const content = contentInput.value;
      let inputExample = "";
      let outputExample = "";
      if (guardrailCheckbox?.checked) {
        const inputEl = document.getElementById("new-prompt-input-example") as HTMLTextAreaElement | null;
        const outputEl = document.getElementById("new-prompt-output-example") as HTMLTextAreaElement | null;
        inputExample = inputEl ? inputEl.value : "";
        outputExample = outputEl ? outputEl.value : "";
      }

      const data = {
        title: title,
        prompt_content: content,
        input_examples: inputExample,
        output_examples: outputExample
      };

      // POST リクエストでサーバーに送信
      fetch("/api/add_task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.message) {
            alert(result.message);
            newPostForm.reset();
            if (guardrailFields) guardrailFields.style.display = "none";
            closeModal();

            // ここでタスク一覧を更新する
            if (window.loadTaskCards) window.loadTaskCards();
          } else {
            alert("エラー: " + result.error);
          }
        })
        .catch((error) => {
          alert("エラーが発生しました: " + error);
        });
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNewPromptModal);
} else {
  initNewPromptModal();
}

export {};
