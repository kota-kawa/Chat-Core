document.addEventListener("DOMContentLoaded", function () {
  const openModalBtn = document.getElementById("openNewPromptModal");
  const plusIcon = openModalBtn?.querySelector(".bi-plus-lg");
  const newPromptModal = document.getElementById("newPromptModal");
  const modalCloseBtn = document.getElementById("newModalCloseBtn");
  const guardrailCheckbox = document.getElementById("new-guardrail-checkbox");
  const guardrailFields = document.getElementById("new-guardrail-fields");
  const newPostForm = document.getElementById("newPostForm");

  const togglePlusRotation = (isRotated, options = {}) => {
    if (!openModalBtn) return;

    const { animate = true } = options;

    if (!animate && plusIcon) {
      plusIcon.classList.add("no-transition");
      openModalBtn.classList.toggle("is-rotated", !!isRotated);

      requestAnimationFrame(() => {
        plusIcon.classList.remove("no-transition");
      });
      return;
    }

    openModalBtn.classList.toggle("is-rotated", !!isRotated);
  };

  const closeModal = (options = {}) => {
    if (!newPromptModal) return;
    newPromptModal.classList.remove("show");

    if (options.skipRotation) {
      togglePlusRotation(false, { animate: false });
      return;
    }

    togglePlusRotation(false, { animate: !!options.animateRotation });
  };

  const openModal = options => {
    if (!newPromptModal) return;
    newPromptModal.classList.add("show");
    togglePlusRotation(true, { animate: !!options?.animateRotation });
  };

  // 初期表示では必ず閉じた状態にし、回転アニメーションは発火させない
  closeModal({ skipRotation: true });

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
  if (guardrailCheckbox) {
    guardrailCheckbox.addEventListener("change", function () {
      guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
    });
  }

  // モーダル内フォームの送信
  if (newPostForm) {
    newPostForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // 各入力項目の値を取得
      const title = document.getElementById("new-prompt-title").value;
      const content = document.getElementById("new-prompt-content").value;
      let inputExample = "";
      let outputExample = "";
      if (guardrailCheckbox.checked) {
        inputExample = document.getElementById("new-prompt-input-example").value;
        outputExample = document.getElementById("new-prompt-output-example").value;
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
      .then(response => response.json())
      .then(result => {
        if (result.message) {
          alert(result.message);
          newPostForm.reset();
          guardrailFields.style.display = "none";
          closeModal();

          // ここでタスク一覧を更新する
          loadTaskCards();
        } else {
          alert("エラー: " + result.error);
        }
      })
      .catch(error => {
        alert("エラーが発生しました: " + error);
      });
    });
  }
});


