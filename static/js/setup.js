// setup.js

// APIからタスクを取得してタスクカードを生成する
function loadTaskCards() {
  // モーダル要素を取得（HTMLに書いた #io-modal, #io-modal-content）
  const ioModal = document.getElementById("io-modal");
  const ioModalContent = document.getElementById("io-modal-content");

  // モーダルを閉じる関数（モーダル全体を非表示に）
  function closeIOModal() {
    ioModal.style.display = "none";
  }

  // 画面のどこかをクリックした時にモーダルが開いていれば閉じる
  document.addEventListener("click", () => {
    if (ioModal.style.display === "block") {
      closeIOModal();
    }
  });

  // モーダルの中身をクリックした時は閉じないようにする（バブリング停止）
  ioModalContent.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // タスク一覧を取得
  fetch("/api/tasks")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("task-selection");
      container.innerHTML = ""; // 既存をクリア

      data.tasks.forEach(task => {
        // 2列レイアウト用ラッパー
        const taskWrapper = document.createElement("div");
        taskWrapper.className = "task-wrapper";

        // カード本体
        const card = document.createElement("div");
        card.className = "prompt-card";
        card.setAttribute("data-task", task.name);

        // ヘッダーコンテナ（タスク名とトグルボタン）
        const headerContainer = document.createElement("div");
        headerContainer.className = "header-container";

        // タスク名
        const header = document.createElement("div");
        header.className = "task-header";
        header.innerText = task.name;

        // トグルボタン(Bootstrapのクラスを使用: btn + btn-outline-success + btn-sm)
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.classList.add("btn", "btn-outline-success", "btn-sm");
        toggleBtn.innerHTML = '<i class="bi bi-caret-down"></i>';

        // 入出力例の文字列
        const inputExamples = task.input_examples || "入力例がありません";
        const outputExamples = task.output_examples || "出力例がありません";

        // トグルボタンのクリック -> モーダルで入出力例を表示
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // このクリックで document へ伝播して閉じないように
          
          // モーダルに入出力例を挿入
          // 毎回クリアして、新しい内容を差し込む
          ioModalContent.innerHTML = `
            <h5 style="margin-bottom: 1rem;">入出力例</h5>
            <div style="margin-bottom: 0.5rem; font-weight: bold;">入力例</div>
            <div style="margin-bottom: 1rem;">${inputExamples}</div>
            <div style="margin-bottom: 0.5rem; font-weight: bold;">出力例</div>
            <div>${outputExamples}</div>
          `;
          
          // モーダルを表示
          ioModal.style.display = "block";
        });

        // ヘッダーにタスク名とボタンを追加 -> カードに追加
        headerContainer.appendChild(header);
        headerContainer.appendChild(toggleBtn);
        card.appendChild(headerContainer);

        // ラッパーにカードを入れて、最終的にコンテナに配置
        taskWrapper.appendChild(card);
        container.appendChild(taskWrapper);
      });
      
      
      
      
      

      

      // タスクカード全体に対してクリックイベントを設定
      initSetupTaskCards();
      // 初期の「もっと見る」ボタン（タスクが6個以上なら）を設定
      initToggleTasks();
      // タスク読み込み後に編集ボタンも再生成
      if (typeof initTaskOrderEditing === 'function') {
        initTaskOrderEditing();
      }
    })
    .catch(error => {
      console.error("タスク読み込みに失敗:", error);
    });
}

// セットアップ画面を表示する（チャット画面は非表示）
function showSetupForm() {
  chatContainer.style.display = 'none';
  setupContainer.style.display = 'block';
  setupInfoElement.value = ''; // 入力フォームをクリア
  loadTaskCards(); // APIからタスクを取得してカードを生成
}

// タスクカードのクリックイベントをイベントデリゲーションでハンドリングする
function initSetupTaskCards() {
  const container = document.getElementById('task-selection');
  // （※不要な重複を避けるため、一度既存のリスナーを削除してもよい）
  container.removeEventListener('click', handleTaskCardClick);
  container.addEventListener('click', handleTaskCardClick);
}

// タスクカードのクリックイベントハンドラー
function handleTaskCardClick(event) {
  // 編集モード中はクリックを無視（ドラッグ専用）
  if (window.isEditingOrder) return;
  const card = event.target.closest('.prompt-card');
  if (!card) return;
  const setupInfo = setupInfoElement.value.trim();
  if (!setupInfo) {
    alert('「現在の状況・作業環境」を入力してください。');
    return;
  }
  const aiModel = aiModelSelect.value;
  const task = card.getAttribute('data-task');

  // 新しいroomIdを作成し、ローカルストレージに保存
  const newRoomId = Date.now().toString();
  currentChatRoomId = newRoomId;
  localStorage.setItem('currentChatRoomId', currentChatRoomId);

  // サーバーにチャットルーム作成リクエストを送信
  createNewChatRoom(newRoomId, setupInfo)
    .then(() => {
      showChatInterface();
      loadChatRooms();
      localStorage.removeItem(`chatHistory_${currentChatRoomId}`);
      const firstMessage = `【状況・作業環境】${setupInfo}\n【リクエスト】${task}`;
      generateResponse(firstMessage, aiModel);
    })
    .catch(err => {
      alert("チャットルーム作成に失敗: " + err);
      console.error(err);
    });
}

// タスクカードが6個以上ある場合、「もっと見る」ボタンで折りたたみ/展開する処理
function initToggleTasks() {
  // 既存の「もっと見る」ボタンがあれば削除する
  const existingToggleBtn = document.getElementById('toggle-tasks-btn');
  if (existingToggleBtn) {
    existingToggleBtn.remove();
  }

  const taskCards = document.querySelectorAll('.task-selection .prompt-card');
  if (taskCards.length > 6) {
    // 6個目以降を初期状態で非表示にする
    for (let i = 6; i < taskCards.length; i++) {
      taskCards[i].style.display = 'none';
    }
    // 「もっと見る」ボタンを作成
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-tasks-btn';
    toggleBtn.type = 'button';
    toggleBtn.classList.add('primary-button');
    toggleBtn.style.width = '100%';
    toggleBtn.style.marginTop = '0.3rem';
    toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i> もっと見る';
    taskSelection.appendChild(toggleBtn);

    let expanded = false;
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      for (let i = 6; i < taskCards.length; i++) {
        taskCards[i].style.display = expanded ? 'flex' : 'none';
      }
      toggleBtn.innerHTML = expanded ? '<i class="bi bi-chevron-up"></i> 閉じる' : '<i class="bi bi-chevron-down"></i> もっと見る';
    });
  }
}


// グローバルへエクスポート
window.showSetupForm = showSetupForm;
window.initToggleTasks = initToggleTasks;
window.initSetupTaskCards = initSetupTaskCards;
