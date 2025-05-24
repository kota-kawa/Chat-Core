/**
 * setup.js
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


// ▼ 1. タスクカード生成・詳細表示 -------------------------------------------------
function loadTaskCards() {
  const ioModal        = document.getElementById("io-modal");
  const ioModalContent = document.getElementById("io-modal-content");

  // モーダルを閉じるヘルパ
  function closeIOModal() { ioModal.style.display = "none"; }

  // 画面クリックでモーダルを閉じる
  document.addEventListener("click", () => {
    if (ioModal.style.display === "block") closeIOModal();
  });
  // 内部クリックでは閉じない
  ioModalContent.addEventListener("click", e => e.stopPropagation());

  // /api/tasks から取得
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("task-selection");
      container.innerHTML = "";

      data.tasks.forEach(task => {
        // ラッパー
        const wrapper     = document.createElement("div");
        wrapper.className = "task-wrapper";

        // カード
        const card = document.createElement("div");
        card.className = "prompt-card";
        card.dataset.task            = task.name;
        card.dataset.prompt_template = task.prompt_template || "プロンプトテンプレートはありません";
        card.dataset.input_examples  = task.input_examples  || "入力例がありません";
        card.dataset.output_examples = task.output_examples || "出力例がありません";

        // ヘッダー（タイトル＋▼ボタン）
        const headerContainer = document.createElement("div");
        headerContainer.className = "header-container";

        const header = document.createElement("div");
        header.className = "task-header";
        header.innerText = task.name.length > 8 ? task.name.substring(0, 8) + "…" : task.name;

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.classList.add("btn", "btn-outline-success", "btn-sm");
        toggleBtn.innerHTML = '<i class="bi bi-caret-down"></i>';

        // ▼クリックで詳細モーダル
        toggleBtn.addEventListener("click", e => {
          e.stopPropagation();
          ioModalContent.innerHTML = `
            <h5 style="margin-bottom:1rem;">タスク詳細</h5>
            <div style="margin-bottom:.5rem;font-weight:bold;">タスク名</div>
            <div style="margin-bottom:1rem;">${card.dataset.task}</div>
            <div style="margin-bottom:.5rem;font-weight:bold;">プロンプトテンプレート</div>
            <div style="margin-bottom:1rem;">${card.dataset.prompt_template}</div>
            <div style="margin-bottom:.5rem;font-weight:bold;">入力例</div>
            <div style="margin-bottom:1rem;">${card.dataset.input_examples}</div>
            <div style="margin-bottom:.5rem;font-weight:bold;">出力例</div>
            <div>${card.dataset.output_examples}</div>`;
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
      if (typeof initTaskOrderEditing === 'function') initTaskOrderEditing();
    })
    .catch(err => console.error("タスク読み込みに失敗:", err));
}

// ▼ 2. セットアップ画面の表示 ------------------------------------------------------
function showSetupForm() {
  chatContainer.style.display  = 'none';
  setupContainer.style.display = 'block';
  setupInfoElement.value = '';
  loadTaskCards();
}

// ▼ 3. タスクカード選択処理 --------------------------------------------------------
function initSetupTaskCards() {
  const container = document.getElementById('task-selection');
  container.removeEventListener('click', handleTaskCardClick);
  container.addEventListener('click',  handleTaskCardClick);
}

function handleTaskCardClick(e) {
  if (window.isEditingOrder) return;                // 並び替え中は無視

  const card = e.target.closest('.prompt-card');
  if (!card) return;

  // 入力フォームの値（空欄可）
  const setupInfo = setupInfoElement.value.trim();  // ← ここは空でも OK
  const aiModel   = aiModelSelect.value;

  const prompt_template = card.dataset.prompt_template;
  const inputExamples   = card.dataset.input_examples;
  const outputExamples  = card.dataset.output_examples;

  // 新チャットルーム ID とタイトル（空欄ならデフォルト名）
  const newRoomId   = Date.now().toString();
  const roomTitle   = setupInfo || '新規チャット';

  currentChatRoomId = newRoomId;
  localStorage.setItem('currentChatRoomId', newRoomId);

  // ① ルームをサーバーに作成
  createNewChatRoom(newRoomId, roomTitle)
    .then(() => {
      showChatInterface();
      loadChatRooms();
      localStorage.removeItem(`chatHistory_${newRoomId}`);

      // ② 最初のメッセージ（setupInfo が空ならラベルごと省略）
      const firstMsg = setupInfo
        ? `【状況・作業環境】${setupInfo}\n【リクエスト】${prompt_template}\n\n入力例:\n${inputExamples}\n\n出力例:\n${outputExamples}`
        : `【リクエスト】${prompt_template}\n\n入力例:\n${inputExamples}\n\n出力例:\n${outputExamples}`;

      // ③ Bot 応答生成
      generateResponse(firstMsg, aiModel);
    })
    .catch(err => alert('チャットルーム作成に失敗: ' + err));
}

// ▼ 4. 「もっと見る」ボタン生成 ----------------------------------------------------
function initToggleTasks() {
  const oldBtn = document.getElementById('toggle-tasks-btn');
  if (oldBtn) oldBtn.remove();

  const cards = document.querySelectorAll('.task-selection .prompt-card');
  if (cards.length > 6) {
    // 7枚目以降を非表示
    [...cards].slice(6).forEach(c => c.style.display = 'none');

    // ボタン生成
    const btn = document.createElement('button');
    btn.type = 'button';                     // ← これで submit 動作を防ぐ
    btn.id   = 'toggle-tasks-btn';
    btn.className     = 'primary-button';
    btn.style.width   = '100%';
    btn.style.marginTop = '.3rem';
    btn.innerHTML     = '<i class="bi bi-chevron-down"></i> もっと見る';

    let expanded = false;
    btn.addEventListener('click', e => {
      e.preventDefault();                   // ← 念のためデフォルト動作もキャンセル
      expanded = !expanded;
      [...cards].slice(6).forEach(c =>
        c.style.display = expanded ? 'flex' : 'none'
      );
      btn.innerHTML = expanded
        ? '<i class="bi bi-chevron-up"></i> 閉じる'
        : '<i class="bi bi-chevron-down"></i> もっと見る';
    });

    // ボタンをリストの末尾に追加
    taskSelection.appendChild(btn);
  }
}


// ---- グローバル公開 -------------------------------------------------------------
window.showSetupForm     = showSetupForm;
window.initToggleTasks   = initToggleTasks;
window.initSetupTaskCards= initSetupTaskCards;
window.loadTaskCards     = loadTaskCards;
