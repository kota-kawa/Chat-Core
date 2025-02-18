// setup.js

// APIからタスクを取得してタスクカードを生成する
function loadTaskCards() {
  fetch("/api/tasks")
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("タスク取得エラー:", data.error);
        return;
      }
      const container = document.getElementById('task-selection');
      container.innerHTML = "";  // 既存の内容をクリア
      data.tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.setAttribute('data-task', task.name);
        // 必要に応じて task.icon などを利用してアイコンを表示することも可能
        card.innerText = task.name;
        container.appendChild(card);
      });
      // タスクカード全体に対してイベントデリゲーションを設定
      initSetupTaskCards();
      initToggleTasks();
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

// クリックされた要素がタスクカードなら、チャットルーム作成・初回メッセージ送信を実行
function handleTaskCardClick(event) {
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
      // 新規ルームなのでローカルチャット履歴は初期化
      localStorage.removeItem(`chatHistory_${currentChatRoomId}`);

      // 最初のメッセージとして、状況と選択タスクを送信
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
