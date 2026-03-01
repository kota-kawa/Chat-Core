/**
 * setup.ts
 *
 * ■ タスクカードの取得・表示 (loadTaskCards)
 *   - /api/tasks からタスク一覧を取得し、.prompt-card を動的生成
 *   - カード下向きアイコンでタスク詳細モーダル（プロンプトテンプレート／入出力例）を表示
 *
 * ■ セットアップ画面切替 (showSetupForm)
 *   - チャット画面を隠し、セットアップ画面を再表示
 *
 * ■ タスク選択でチャット開始 (handleTaskCardClick)
 *   - 「状況・作業環境」入力＋カードクリックで新規チャットルーム作成
 *   - 最初のメッセージを Bot に投げてチャットを開始
 *
 * ■ 「もっと見る」折り畳み機能 (initToggleTasks)
 *   - タスクが 6 件超えると 7 件目以降を折り畳み、展開／折り畳みボタンを生成
 */
import defaultTasks from "../../data/default_tasks.json";

type TaskItem = {
  name?: string;
  prompt_template?: string;
  input_examples?: string;
  output_examples?: string;
  is_default?: boolean;
};

// ▼ 1. タスクカード生成・詳細表示 -------------------------------------------------
function getFallbackTasks() {
  return (defaultTasks as TaskItem[]).map((task) => ({
    ...task,
    is_default: true
  }));
}

function escapeHtml(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTask(task: TaskItem | null | undefined) {
  if (!task) {
    return {
      name: "",
      prompt_template: "",
      input_examples: "",
      output_examples: "",
      is_default: false
    };
  }

  return {
    name: task.name ? String(task.name).trim() : "",
    prompt_template: task.prompt_template ? String(task.prompt_template) : "",
    input_examples: task.input_examples ? String(task.input_examples) : "",
    output_examples: task.output_examples ? String(task.output_examples) : "",
    is_default: Boolean(task.is_default)
  };
}

function createTaskSignature(tasks: TaskItem[]) {
  if (!Array.isArray(tasks) || tasks.length === 0) return "__empty__";
  return tasks
    .map((task) => {
      const normalized = normalizeTask(task);
      return [
        normalized.name,
        normalized.prompt_template,
        normalized.input_examples,
        normalized.output_examples,
        normalized.is_default ? "1" : "0"
      ].join("\u001f");
    })
    .join("\u001e");
}

function hydrateSSRTaskCards() {
  const container = document.getElementById("task-selection");
  if (!container || container.dataset.tasksSignature) return;

  const hasSSRTaskCards = container.querySelector(".task-wrapper .prompt-card") !== null;
  if (!hasSSRTaskCards) return;

  // SSR で描画済みのデフォルトカードを初期状態として採用し、初回再描画を避ける
  container.dataset.tasksSignature = createTaskSignature(getFallbackTasks());
  initSetupTaskCards();
  initToggleTasks();
  if (typeof window.initTaskOrderEditing === "function") window.initTaskOrderEditing();
}

function loadTaskCards() {
  const ioModal = document.getElementById("io-modal");
  const ioModalContent = document.getElementById("io-modal-content");
  const taskSelection = document.getElementById("task-selection");

  // モーダルを閉じるヘルパ
  function closeIOModal() {
    if (ioModal) ioModal.style.display = "none";
  }

  if (ioModal && ioModalContent && !ioModal.dataset.bound) {
    ioModal.dataset.bound = "true";
    // 画面クリックでモーダルを閉じる
    document.addEventListener("click", () => {
      if (ioModal && ioModal.style.display === "block") closeIOModal();
    });
    // 内部クリックでは閉じない
    if (ioModalContent) {
      ioModalContent.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  const openTaskDetailModal = (card: HTMLElement) => {
    if (!ioModal || !ioModalContent) return;
    const safeTask = escapeHtml(card.dataset.task || "");
    const safePromptTemplate = escapeHtml(card.dataset.prompt_template || "");
    const safeInputExamples = escapeHtml(card.dataset.input_examples || "");
    const safeOutputExamples = escapeHtml(card.dataset.output_examples || "");
    ioModalContent.innerHTML = `
      <h5 style="margin-bottom:1rem;">タスク詳細</h5>
      <div style="margin-bottom:.5rem;font-weight:bold;">タスク名</div>
      <div style="margin-bottom:1rem;">${safeTask}</div>
      <div style="margin-bottom:.5rem;font-weight:bold;">プロンプトテンプレート</div>
      <div style="margin-bottom:1rem;">${safePromptTemplate}</div>
      <div style="margin-bottom:.5rem;font-weight:bold;">入力例</div>
      <div style="margin-bottom:1rem;">${safeInputExamples}</div>
      <div style="margin-bottom:.5rem;font-weight:bold;">出力例</div>
      <div>${safeOutputExamples}</div>`;
    ioModal.style.display = "block";
  };

  if (taskSelection && !taskSelection.dataset.detailBound) {
    taskSelection.dataset.detailBound = "true";
    taskSelection.addEventListener("click", (e) => {
      const target = e.target as Element | null;
      const detailButton = target?.closest(".task-detail-toggle");
      if (!detailButton) return;
      e.preventDefault();
      e.stopPropagation();
      const card = detailButton.closest(".prompt-card") as HTMLElement | null;
      if (!card) return;
      openTaskDetailModal(card);
    });
  }

  const renderTaskCards = (tasks: TaskItem[]) => {
    const container = document.getElementById("task-selection");
    if (!container) return;
    const signature = createTaskSignature(tasks);

    // 同一内容の再描画は避け、遅延後の「全体再表示」を抑える
    if (container.dataset.tasksSignature === signature) return;
    container.dataset.tasksSignature = signature;

    // コンテナをクリア
    container.innerHTML = "";

    // タスクが空の場合はメッセージを表示
    if (!tasks || tasks.length === 0) {
      container.innerHTML = "<p>タスクが見つかりませんでした。</p>";
      return;
    }

    tasks.forEach((task) => {
      // task自体がnull/undefinedの場合はスキップ（念のため）
      if (!task) return;

      const taskName =
        typeof task.name === "string" && task.name.trim()
          ? task.name.trim()
          : task.name
            ? String(task.name)
            : "無題";

      // ラッパー
      const wrapper = document.createElement("div");
      wrapper.className = "task-wrapper";

      // カード
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.dataset.task = taskName;
      card.dataset.prompt_template = task.prompt_template || "プロンプトテンプレートはありません";
      card.dataset.input_examples = task.input_examples || "入力例がありません";
      card.dataset.output_examples = task.output_examples || "出力例がありません";
      card.dataset.is_default = task.is_default ? "true" : "false";

      // ヘッダー（タイトル＋▼ボタン）
      const headerContainer = document.createElement("div");
      headerContainer.className = "header-container";

      const header = document.createElement("div");
      header.className = "task-header";
      header.textContent = taskName.length > 8 ? taskName.substring(0, 8) + "…" : taskName;

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.classList.add("btn", "btn-outline-success", "btn-md", "task-detail-toggle");
      toggleBtn.innerHTML = '<i class="bi bi-caret-down"></i>';

      headerContainer.append(header, toggleBtn);
      card.appendChild(headerContainer);
      wrapper.appendChild(card);
      container.appendChild(wrapper);
    });

    // クリック／並び替え関係の初期化
    initSetupTaskCards();
    initToggleTasks();
    if (typeof window.initTaskOrderEditing === "function") window.initTaskOrderEditing();
  };

  const applyTasks = (tasks: TaskItem[]) => {
    // タスクが空、もしくは配列でない場合はフォールバックを表示
    if (!Array.isArray(tasks) || tasks.length === 0) {
      renderTaskCards(getFallbackTasks());
      return;
    }
    renderTaskCards(tasks);
  };

  hydrateSSRTaskCards();

  // 初期ロード時: まずはフォールバックを表示しておく
  renderTaskCards(getFallbackTasks());

  // /api/tasks から取得
  fetch("/api/tasks")
    .then((r) => {
      const contentType = r.headers.get("content-type") || "";
      if (!r.ok) {
        throw new Error(`tasks fetch failed: ${r.status}`);
      }
      if (!contentType.includes("application/json")) {
        throw new Error("tasks response is not json");
      }
      return r.json();
    })
    .then((data) => {
      const tasks: TaskItem[] = Array.isArray(data?.tasks) ? data.tasks : [];
      applyTasks(tasks);
    })
    .catch((err) => {
      console.error("タスク読み込みに失敗:", err);
      // エラー時もフォールバックを表示
      applyTasks([]);
    });
}

// ▼ 2. セットアップ画面の表示 ------------------------------------------------------
function showSetupForm() {
  const chatContainer = document.getElementById("chat-container");
  const setupContainer = document.getElementById("setup-container");
  const setupInfoElement = document.getElementById("setup-info") as HTMLTextAreaElement | null;

  if (chatContainer) chatContainer.style.display = "none";
  if (setupContainer) setupContainer.style.display = "block";
  if (setupInfoElement) setupInfoElement.value = "";

  // サイドバーの状態をクリーンアップ
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
  }
  document.body.classList.remove("sidebar-visible");

  loadTaskCards();
}

// ▼ 3. タスクカード選択処理 --------------------------------------------------------
function initSetupTaskCards() {
  const container = document.getElementById("task-selection");
  if (!container) return;
  container.removeEventListener("click", handleTaskCardClick);
  container.addEventListener("click", handleTaskCardClick);
}

function handleTaskCardClick(e: Event) {
  if (window.isEditingOrder) return; // 並び替え中は無視

  const target = e.target as Element | null;
  const card = target?.closest(".prompt-card") as HTMLElement | null;
  if (!card) return;

  const setupInfoElement = document.getElementById("setup-info") as HTMLTextAreaElement | null;
  const aiModelSelect = document.getElementById("ai-model") as HTMLSelectElement | null;
  const chatMessages = document.getElementById("chat-messages");

  // 入力フォームの値（空欄可）
  const setupInfo = setupInfoElement ? setupInfoElement.value.trim() : "";
  const aiModel = aiModelSelect ? aiModelSelect.value : "gemini-2.5-flash";

  const prompt_template = card.dataset.prompt_template || "";
  const inputExamples = card.dataset.input_examples || "";
  const outputExamples = card.dataset.output_examples || "";

  // 新チャットルーム ID とタイトル
  const newRoomId = Date.now().toString();
  const roomTitle = setupInfo || "新規チャット";

  // currentChatRoomId はグローバルまたは他で定義されている前提
  window.currentChatRoomId = newRoomId;
  localStorage.setItem("currentChatRoomId", newRoomId);

  // ① ルームをサーバーに作成
  if (typeof window.createNewChatRoom === "function") {
    window.createNewChatRoom(newRoomId, roomTitle)
      .then(() => {
        if (typeof window.showChatInterface === "function") window.showChatInterface();
        // 新しいチャットではメッセージ表示をリセット
        if (chatMessages) chatMessages.innerHTML = "";
        if (typeof window.loadChatRooms === "function") window.loadChatRooms();
        localStorage.removeItem(`chatHistory_${newRoomId}`);

        // ② 最初のメッセージ
        const firstMsg = setupInfo
          ? `【状況・作業環境】${setupInfo}\n【リクエスト】${prompt_template}\n\n入力例:\n${inputExamples}\n\n出力例:\n${outputExamples}`
          : `【リクエスト】${prompt_template}\n\n入力例:\n${inputExamples}\n\n出力例:\n${outputExamples}`;

        // ③ Bot 応答生成
        if (typeof window.generateResponse === "function") window.generateResponse(firstMsg, aiModel);
      })
      .catch((err) => alert("チャットルーム作成に失敗: " + err));
  } else {
    console.error("createNewChatRoom is not defined");
  }
}

// ▼ 4. 「もっと見る」ボタン生成 ----------------------------------------------------
function initToggleTasks() {
  const container = document.querySelector<HTMLElement>(".task-selection");
  if (!container) return;
  const oldBtn = document.getElementById("toggle-tasks-btn");
  if (oldBtn) oldBtn.remove();

  const cards = [...container.querySelectorAll<HTMLElement>(".prompt-card")];

  // 以前の inline 指定が残っていても CSS クラス制御を優先する
  cards.forEach((card) => {
    if (card.style.display) card.style.removeProperty("display");
  });

  container.classList.remove("tasks-expanded");

  if (cards.length <= 6) {
    container.classList.remove("tasks-collapsed");
    return;
  }

  container.classList.add("tasks-collapsed");

  // ボタン生成
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "toggle-tasks-btn";
  btn.className = "primary-button";
  btn.style.width = "100%";
  btn.style.marginTop = "0.1rem";

  let expanded = false;
  const applyExpandedState = () => {
    container.classList.toggle("tasks-expanded", expanded);
    btn.innerHTML = expanded ? '<i class="bi bi-chevron-up"></i> 閉じる' : '<i class="bi bi-chevron-down"></i> もっと見る';
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    expanded = !expanded;
    applyExpandedState();
  });
  applyExpandedState();

  // ボタンをリストの末尾に追加
  const selectionContainer = window.taskSelection || container;
  selectionContainer.appendChild(btn);
}

// ---- グローバル公開 -------------------------------------------------------------
window.showSetupForm = showSetupForm;
window.initToggleTasks = initToggleTasks;
window.initSetupTaskCards = initSetupTaskCards;
window.loadTaskCards = loadTaskCards;

export {};
