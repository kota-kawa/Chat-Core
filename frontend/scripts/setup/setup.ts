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

type TaskItem = {
  name?: string;
  prompt_template?: string;
  input_examples?: string;
  output_examples?: string;
  is_default?: boolean;
};

// ▼ 1. タスクカード生成・詳細表示 -------------------------------------------------
const FALLBACK_TASKS: TaskItem[] = [
  {
    name: "📧 メール作成",
    prompt_template: "状況や作業環境をもとに、メールを作成して。",
    input_examples: "新製品リリースの案内のメール作成をしたい。",
    output_examples:
      "件名：新製品発売のご案内\n本文：拝啓　時下ますますご健勝のこととお慶び申し上げます。さて、この度弊社では画期的な新製品をリリースいたしましたので、ご案内申し上げます。つきましては、詳細資料を同封いたしましたのでご一読いただけますと幸甚です。今後とも何卒よろしくお願い申し上げます。",
  },
  {
    name: "💡 アイデア発想",
    prompt_template: "独創的なアイデアの発想をしてほしい。",
    input_examples: "店舗の集客を増やすためのアイデアを考えて。",
    output_examples:
      "1. お得なクーポン付きSNSキャンペーンの実施 2. 店舗イベントの定期開催 3. 地域の他店舗と連携したスタンプラリー企画",
  },
  {
    name: "📄 要約",
    prompt_template: "状況・作業環境に入力された文を要約して。",
    input_examples: "長編小説のストーリーを簡潔にまとめたいので、要約して。",
    output_examples:
      "本作品は、主人公が旅を通じて自分自身と向き合い、家族の絆を再確認する物語です。主要なテーマは成長と和解で、山場となるシーンでは過去の葛藤を乗り越える様子が描かれています。",
  },
  {
    name: "🛠️ 問題解決",
    prompt_template: "問題解決に協力してほしい。",
    input_examples: "人事トラブル（メンバー同士の衝突）の問題解決をしたい。",
    output_examples:
      "1. 当事者双方からヒアリングを行い、事実関係を整理する 2. 第三者が入る調整会議を設定し、意見をすり合わせる 3. 再発防止のためのコミュニケーションルールを策定",
  },
  {
    name: "📋 問題へ回答",
    prompt_template: "問題へ回答するのを手伝ってほしい。",
    input_examples: "物理の問題：自由落下の公式を教えてください。",
    output_examples:
      "自由落下の距離を表す公式は、d = (1/2)gt^2 です（gは重力加速度、tは落下時間）。初速度が0の場合に適用できます。",
  },
  {
    name: "ℹ️ 情報提供",
    prompt_template: "状況・作業環境に入力されたものについての情報提供をしてほしい。",
    input_examples: "新型コロナウイルスの最新情報が知りたい。",
    output_examples:
      "現在の感染状況は地域によって大きく異なりますが、新しい変異株の動向やワクチン接種の進捗が焦点となっています。最新情報は厚生労働省の公式サイトやWHOのリリースを確認するのが望ましいです。",
  },
  {
    name: "🍳 レシピ",
    prompt_template: "状況・作業環境に入力された情報をもとにレシピを考えて。",
    input_examples: "野菜がメインで、ヘルシーな朝食のレシピが知りたい。",
    output_examples:
      "グリル野菜と卵を使ったオーブン焼きはいかがでしょう。お好みの野菜（パプリカ、ズッキーニ、玉ねぎなど）をカットして卵と一緒に耐熱皿に入れ、オリーブオイルと塩コショウで調味。オーブンで焼けばヘルシーかつ手軽に作れます。",
  },
  {
    name: "✈️ 旅行計画",
    prompt_template: "状況・作業環境の内容をもとに、旅行計画を立ててほしい。",
    input_examples: "国内旅行、2泊3日、温泉と自然を満喫したいので、旅行計画を考えて。",
    output_examples:
      "草津温泉（群馬県）をおすすめします。1日目は湯畑周辺を散策し、温泉街を楽しむ。2日目は近隣の自然公園で軽いハイキングをして、夜は旅館で温泉三昧。3日目は地元の名物を堪能してから帰路へ。",
  },
  {
    name: "💬 悩み相談",
    prompt_template: "悩み相談にのってほしい。",
    input_examples: "恋愛で告白する勇気が出ないです。",
    output_examples:
      "まずは自分の気持ちを素直に認めましょう。そして、相手とのコミュニケーションで小さなステップを積み重ね、信頼関係を築くことが大切です。失敗を恐れる気持ちはわかりますが、行動しなければ何も変わりません。勇気を出して一歩を踏み出すことで、状況が前向きに進む可能性があります。",
  },
  {
    name: "📨 メッセージへの返答",
    prompt_template: "状況・作業環境の内容を踏まえて、メッセージへの返答を一緒に考えてほしい。",
    input_examples:
      "上司から「すぐに会議室に来て」とLINEで連絡がきた場合にどのようにメッセージに返答すればよい？",
    output_examples: "了解しました。すぐに向かいます。何か準備が必要なものはありますか？",
  },
  {
    name: "💑 デート計画",
    prompt_template: "状況・作業環境の内容を踏まえて、デートの計画を立ててほしい。",
    input_examples: "花火大会に行く予定、夜メインで楽しみたいので、デート計画を立てて。",
    output_examples:
      "夕方から浴衣で合流し、屋台で食べ歩きを楽しんだ後、花火をゆっくり観賞. その後は近くのバーで軽くドリンクを飲みながら余韻に浸るのはいかがでしょうか。",
  },
];

function getFallbackTasks() {
  return FALLBACK_TASKS.map((task) => ({
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

function loadTaskCards() {
  const ioModal = document.getElementById("io-modal");
  const ioModalContent = document.getElementById("io-modal-content");

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

  const renderTaskCards = (tasks: TaskItem[]) => {
    const container = document.getElementById("task-selection");
    if (!container) return;

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
      toggleBtn.classList.add("btn", "btn-outline-success", "btn-md");
      toggleBtn.innerHTML = '<i class="bi bi-caret-down"></i>';

      // ▼クリックで詳細モーダル
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
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
      });

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
  const container = document.querySelector(".task-selection");
  if (!container) return;
  const oldBtn = document.getElementById("toggle-tasks-btn");
  if (oldBtn) oldBtn.remove();

  const cards = document.querySelectorAll<HTMLElement>(".task-selection .prompt-card");
  if (cards.length > 6) {
    // 7枚目以降を非表示
    [...cards].slice(6).forEach((c) => (c.style.display = "none"));

    // ボタン生成
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "toggle-tasks-btn";
    btn.className = "primary-button";
    btn.style.width = "100%";
    btn.style.marginTop = "0.1rem";
    btn.innerHTML = '<i class="bi bi-chevron-down"></i> もっと見る';

    let expanded = false;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      expanded = !expanded;
      [...cards].slice(6).forEach((c) => (c.style.display = expanded ? "flex" : "none"));
      btn.innerHTML = expanded ? '<i class="bi bi-chevron-up"></i> 閉じる' : '<i class="bi bi-chevron-down"></i> もっと見る';
    });

    // ボタンをリストの末尾に追加
    const selectionContainer = window.taskSelection || container;
    selectionContainer.appendChild(btn);
  }
}

// ---- グローバル公開 -------------------------------------------------------------
window.showSetupForm = showSetupForm;
window.initToggleTasks = initToggleTasks;
window.initSetupTaskCards = initSetupTaskCards;
window.loadTaskCards = loadTaskCards;

export {};
