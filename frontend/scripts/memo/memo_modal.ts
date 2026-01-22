const setupMemoModal = () => {
  const modal = document.getElementById("memoModal");
  if (!modal) {
    return;
  }

  const authButtons = document.getElementById("auth-buttons");
  const userIcon = document.getElementById("userIcon");
  const loginBtn = document.getElementById("login-btn");

  const notifyAuthState = (loggedIn: boolean) => {
    window.loggedIn = loggedIn;
    document.dispatchEvent(
      new CustomEvent("authstatechange", {
        detail: { loggedIn }
      })
    );
  };

  const applyAuthUI = (loggedIn: boolean) => {
    if (authButtons) {
      authButtons.style.display = loggedIn ? "none" : "";
    }
    if (userIcon) {
      userIcon.style.display = loggedIn ? "" : "none";
    }
    if (!loggedIn && loginBtn) {
      loginBtn.onclick = () => {
        window.location.href = "/login";
      };
    }
  };

  fetch("/api/current_user")
    .then((res) => {
      if (!res.ok) {
        return { logged_in: false };
      }
      return res.json();
    })
    .then((data) => {
      const loggedIn = Boolean(data.logged_in);
      notifyAuthState(loggedIn);
      applyAuthUI(loggedIn);
    })
    .catch(() => {
      notifyAuthState(false);
      applyAuthUI(false);
    });

  const closeTargets = modal.querySelectorAll("[data-close-modal]");
  const titleEl = modal.querySelector("[data-modal-title]");
  const dateEl = modal.querySelector("[data-modal-date]");
  const tagsEl = modal.querySelector("[data-modal-tags]");
  const inputEl = modal.querySelector("[data-modal-input]");
  const responseEl = modal.querySelector("[data-modal-response]");

  const clearModal = () => {
    if (titleEl) titleEl.textContent = "保存したメモ";
    if (dateEl) dateEl.textContent = "";
    if (tagsEl) tagsEl.innerHTML = "";
    if (inputEl) inputEl.textContent = "";
    if (responseEl) responseEl.textContent = "";
  };

  const renderTags = (tags: string[]) => {
    if (!tagsEl) return;
    tagsEl.innerHTML = "";
    if (!tags || tags.length === 0) {
      const emptyTag = document.createElement("span");
      emptyTag.className = "memo-tag memo-tag--muted";
      emptyTag.textContent = "タグなし";
      tagsEl.appendChild(emptyTag);
      return;
    }

    tags.forEach((tag) => {
      if (!tag) return;
      const chip = document.createElement("span");
      chip.className = "memo-tag";
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });
  };

  const openModal = (memo: {
    title?: string;
    date?: string;
    tags?: string[];
    input?: string;
    response?: string;
  }) => {
    clearModal();
    if (titleEl) titleEl.textContent = memo.title || "保存したメモ";
    if (dateEl) dateEl.textContent = memo.date || "";
    renderTags(memo.tags || []);
    if (inputEl) inputEl.textContent = memo.input || "";
    if (responseEl) responseEl.textContent = memo.response || "";
    modal.classList.add("is-visible");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    setTimeout(clearModal, 200);
  };

  closeTargets.forEach((trigger) => {
    trigger.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-visible")) {
      closeModal();
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  const memoItems = document.querySelectorAll<HTMLElement>(".memo-item");
  memoItems.forEach((item) => {
    item.addEventListener("click", () => {
      const input = item.dataset.input ? JSON.parse(item.dataset.input) : "";
      const response = item.dataset.response ? JSON.parse(item.dataset.response) : "";
      const tagString = item.dataset.tags || "";
      const tags = tagString
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean);

      openModal({
        title: item.dataset.title || "保存したメモ",
        date: item.dataset.date || "",
        tags,
        input,
        response
      });
    });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMemoModal);
} else {
  setupMemoModal();
}

export {};
