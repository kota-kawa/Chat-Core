document.addEventListener("DOMContentLoaded", function () {
  const openModalBtn = document.getElementById("openNewPromptModal");       // ＋ボタン
  const newPromptModal = document.getElementById("newPromptModal");         // モーダル全体（ラッパ）
  const modalCloseBtn = document.getElementById("newModalCloseBtn");        // 閉じる(X)ボタン
  const guardrailCheckbox = document.getElementById("new-guardrail-checkbox");
  const guardrailFields = document.getElementById("new-guardrail-fields");

  // ＋ボタンを押すとモーダル表示
  if (openModalBtn && newPromptModal) {
    openModalBtn.addEventListener("click", function (e) {
      e.preventDefault();
      newPromptModal.classList.add("show");
    });
  }

  // 閉じるボタンでモーダルを閉じる
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", function (e) {
      e.preventDefault();
      newPromptModal.classList.remove("show");
    });
  }

  // モーダル背景クリックで閉じる
  if (newPromptModal) {
    newPromptModal.addEventListener("click", function (e) {
      if (e.target === newPromptModal) {
        newPromptModal.classList.remove("show");
      }
    });
  }

  // ガードレールチェックボックスで入出力例部分の表示切替
  if (guardrailCheckbox) {
    guardrailCheckbox.addEventListener("change", function () {
      guardrailFields.style.display = guardrailCheckbox.checked ? "block" : "none";
    });
  }

  // モーダル内フォームの送信はデザインのみ（送信を止めてアラート表示）
  const newPostForm = document.getElementById("newPostForm");
  if (newPostForm) {
    newPostForm.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("（デザインのみ）投稿が完了しました。");
      newPostForm.reset();
      guardrailFields.style.display = "none";
      newPromptModal.classList.remove("show");
    });
  }
});