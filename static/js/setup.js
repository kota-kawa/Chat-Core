// setup.js

// セットアップ画面を表示
function showSetupForm() {
  chatContainer.style.display = 'none';
  setupContainer.style.display = 'block';
  setupInfoElement.value = ''; // 入力フォームをクリアする
}

// タスクが6個以上ある場合、「もっと見る」ボタンで折りたたむ処理を初期化
function initToggleTasks() {
  const taskCards = document.querySelectorAll('.task-selection .prompt-card');
  if (taskCards.length > 6) {
    // 6個目以降を非表示
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

// タスクカードをクリックした際の処理
function initSetupTaskCards() {
  setupTaskCards.forEach(card => {
    card.addEventListener('click', () => {
      const setupInfo = setupInfoElement.value.trim();
      if (!setupInfo) {
        alert('「現在の状況・作業環境」を入力してください。');
        return;
      }
      const aiModel = aiModelSelect.value;
      const task = card.getAttribute('data-task');

      // 新しいroomIdを作成しローカルストレージにも保存
      const newRoomId = Date.now().toString();
      currentChatRoomId = newRoomId;
      localStorage.setItem('currentChatRoomId', currentChatRoomId);

      // サーバーにチャットルーム作成リクエスト
      createNewChatRoom(newRoomId, setupInfo)
        .then(() => {
          showChatInterface();
          loadChatRooms();
          // 新規ルームなのでローカルチャット履歴は初期化
          localStorage.removeItem(`chatHistory_${currentChatRoomId}`);

          // 最初のメッセージ（状況＋タスク）を送信
          const firstMessage = `【状況・作業環境】${setupInfo}\n【リクエスト】${task}`;
          generateResponse(firstMessage, aiModel);
        })
        .catch(err => {
          alert("チャットルーム作成に失敗: " + err);
          console.error(err);
        });
    });
  });
}

// グローバルへエクスポート
window.showSetupForm = showSetupForm;
window.initToggleTasks = initToggleTasks;
window.initSetupTaskCards = initSetupTaskCards;
