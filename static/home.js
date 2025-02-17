document.addEventListener('DOMContentLoaded', () => {
  const setupContainer = document.getElementById('setup-container');
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const typingIndicator = document.getElementById('typing-indicator');
  const backToSetupBtn = document.getElementById('back-to-setup');
  const newChatBtn = document.getElementById('new-chat-btn');
  const chatRoomListEl = document.getElementById('chat-room-list');
  const setupInfoElement = document.getElementById('setup-info');
  const aiModelSelect = document.getElementById('ai-model');
  const accessChatBtn = document.getElementById('access-chat-btn');

  let currentChatRoomId = null;

  // DOM読み込み時、ローカルストレージに保存済みの currentChatRoomId があれば復元
  if (localStorage.getItem('currentChatRoomId')) {
    currentChatRoomId = localStorage.getItem('currentChatRoomId');
  }

  // タスク選択のカード（セットアップ画面）
  const setupTaskCards = document.querySelectorAll('.task-selection .prompt-card');

  // ------------------------
  // タスクカードを6個以上の場合は折りたたむ処理
  // ------------------------
  const taskCards = document.querySelectorAll('.task-selection .prompt-card');
  if (taskCards.length > 6) {
    // 6個目以降を非表示にする
    for (let i = 6; i < taskCards.length; i++) {
      taskCards[i].style.display = 'none';
    }
    
    // 「もっと見る」ボタンを作成してタスク選択欄の末尾に追加
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-tasks-btn';
    toggleBtn.type = 'button';
    toggleBtn.classList.add('primary-button');
    toggleBtn.style.width = '100%';
    toggleBtn.style.marginTop = '1rem';
    toggleBtn.textContent = 'もっと見る';
    
    document.querySelector('.task-selection').appendChild(toggleBtn);
    
    // ボタンのクリックイベント：表示/非表示の切り替え
    let expanded = false;
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      for (let i = 6; i < taskCards.length; i++) {
        taskCards[i].style.display = expanded ? 'flex' : 'none';
      }
      toggleBtn.textContent = expanded ? '閉じる' : 'もっと見る';
    });
  }

  // ------------------------
  // 初期処理
  // ------------------------
  showSetupForm(); // 最初はセットアップ画面
  loadChatRooms(); // サイドバー更新

  // ページ復帰時、保存済みチャット履歴を復元
  if (currentChatRoomId) {
    showChatInterface();
    loadLocalChatHistory();
  }

  // ------------------------
  // イベント
  // ------------------------

  // タスク選択（例）
  setupTaskCards.forEach(card => {
    card.addEventListener('click', () => {
      const setupInfo = setupInfoElement.value.trim();
      if (!setupInfo) {
        alert('「現在の状況・作業環境」を入力してください。');
        return;
      }
      const aiModel = aiModelSelect.value;
      const task = card.getAttribute('data-task');

      // 新しいroomId作成しローカルストレージにも保存
      const newRoomId = Date.now().toString();
      currentChatRoomId = newRoomId;
      localStorage.setItem('currentChatRoomId', currentChatRoomId);

      // サーバーにチャットルーム作成リクエスト
      createNewChatRoom(newRoomId, setupInfo)
        .then(() => {
          showChatInterface();
          loadChatRooms();  // サイドバー更新
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

  // 「新規チャット」ボタン
  newChatBtn.addEventListener('click', () => {
    currentChatRoomId = null;
    localStorage.removeItem('currentChatRoomId');
    chatMessages.innerHTML = '';
    showSetupForm();
  });

  // 「これまでのチャットを見る」ボタン
  accessChatBtn.addEventListener('click', () => {
    showChatInterface();
    loadChatRooms();
    loadLocalChatHistory();
    loadChatHistory(); // サーバー側から最新情報を取得
  });

  // 送信ボタン
  sendBtn.addEventListener('click', sendMessage);

  // Enterキーで送信
  userInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 高さ自動調整
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  // 戻るボタン
  backToSetupBtn.addEventListener('click', showSetupForm);

  // ------------------------
  // 画面制御
  // ------------------------

  function showSetupForm() {
    chatContainer.style.display = 'none';
    setupContainer.style.display = 'block';
  }

  function showChatInterface() {
    setupContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    if (!currentChatRoomId && localStorage.getItem('currentChatRoomId')) {
      currentChatRoomId = localStorage.getItem('currentChatRoomId');
    }
  }

  /**
   * サーバー側のチャットルーム一覧を取得して描画
   */
  function loadChatRooms() {
    fetch('/api/get_chat_rooms')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("get_chat_roomsエラー:", data.error);
          return;
        }
        const rooms = data.rooms || [];
        chatRoomListEl.innerHTML = '';

        // 新しい順に表示
        rooms.forEach(room => {
          const roomEl = document.createElement('div');
          roomEl.className = 'chat-room-card';
          if (room.id === currentChatRoomId) {
            roomEl.classList.add('active');
          }

          const titleSpan = document.createElement('span');
          titleSpan.textContent = room.title || '新規チャット';

          roomEl.addEventListener('click', (e) => {
            if (e.target.closest('.room-actions-icon') || e.target.closest('.room-actions-menu')) {
              return;
            }
            switchChatRoom(room.id);
          });

          // ３点アイコンとアクションメニュー
          const actionsIcon = document.createElement('i');
          actionsIcon.className = 'bi bi-three-dots-vertical room-actions-icon';

          const actionsMenu = document.createElement('div');
          actionsMenu.className = 'room-actions-menu';

          const renameItem = document.createElement('div');
          renameItem.className = 'menu-item';
          renameItem.textContent = '名前変更';
          renameItem.addEventListener('click', (e) => {
            e.stopPropagation();
            actionsMenu.style.display = 'none';
            const newName = prompt('新しいチャットルーム名を入力', room.title);
            if (newName && newName.trim() !== '') {
              renameChatRoom(room.id, newName.trim());
            }
          });

          const deleteItem = document.createElement('div');
          deleteItem.className = 'menu-item';
          deleteItem.textContent = '削除';
          deleteItem.addEventListener('click', (e) => {
            e.stopPropagation();
            actionsMenu.style.display = 'none';
            if (confirm(`「${room.title}」を削除しますか？`)) {
              deleteChatRoom(room.id);
            }
          });

          actionsMenu.appendChild(renameItem);
          actionsMenu.appendChild(deleteItem);

          actionsIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.room-actions-menu').forEach(menu => {
              if (menu !== actionsMenu) {
                menu.style.display = 'none';
              }
            });
            actionsMenu.style.display = (actionsMenu.style.display === 'block') ? 'none' : 'block';
          });

          const rightSide = document.createElement('div');
          rightSide.style.display = 'flex';
          rightSide.style.alignItems = 'center';
          rightSide.appendChild(actionsIcon);

          roomEl.appendChild(titleSpan);
          roomEl.appendChild(rightSide);
          roomEl.appendChild(actionsMenu);

          chatRoomListEl.appendChild(roomEl);
        });
      })
      .catch(err => {
        console.error("チャットルーム一覧取得失敗:", err);
      });
  }

  /**
   * チャットルーム切り替え
   */
  function switchChatRoom(roomId) {
    currentChatRoomId = roomId;
    localStorage.setItem('currentChatRoomId', currentChatRoomId);
    showChatInterface();
    loadChatRooms();
    loadLocalChatHistory();
    loadChatHistory();
  }

  /**
   * サーバー側のチャット履歴を取得（最新情報に更新）
   */
  function loadChatHistory() {
    if (!currentChatRoomId) {
      chatMessages.innerHTML = '';
      return;
    }
    fetch(`/api/get_chat_history?room_id=${currentChatRoomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("get_chat_historyエラー:", data.error);
          return;
        }
        chatMessages.innerHTML = '';
        const serverMessages = data.messages || [];
        serverMessages.forEach(m => {
          // 取得した「生テキスト」を displayMessage で整形表示
          displayMessage(m.message, m.sender);
        });
        // ローカルストレージも更新
        const localKey = `chatHistory_${currentChatRoomId}`;
        const saveArray = serverMessages.map(m => ({ text: m.message, sender: m.sender }));
        localStorage.setItem(localKey, JSON.stringify(saveArray));
      })
      .catch(err => {
        console.error("チャット履歴取得失敗:", err);
      });
  }

  /**
   * ローカルストレージからチャット履歴を復元して描画
   */
  function loadLocalChatHistory() {
    if (!currentChatRoomId) return;
    const key = `chatHistory_${currentChatRoomId}`;
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      history = [];
    }
    chatMessages.innerHTML = '';
    history.forEach(item => {
      // ローカルストレージ上も生テキストを持っている想定 → 整形して表示
      displayMessage(item.text, item.sender);
    });
  }

  /**
   * メッセージ送信処理
   */
  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    const aiModel = aiModelSelect.value;
    showTypingIndicator();
    generateResponse(message, aiModel);

    userInput.value = '';
    userInput.style.height = 'auto';
  }

  function generateResponse(message, aiModel) {
    // ユーザーの送信メッセージを即時表示
    renderUserMessage(message);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        chat_room_id: currentChatRoomId,
        model: aiModel
      })
    })
      .then(res => res.json())
      .then(data => {
        hideTypingIndicator();
        if (data.response) {
          // 部分生成しながら整形表示
          animateBotMessage(data.response);
        } else if (data.error) {
          animateBotMessage("エラー: " + data.error);
        }
      })
      .catch(err => {
        hideTypingIndicator();
        animateBotMessage("エラー: " + err.toString());
      });
  }

  // タイピングインジケータの表示／非表示
  function showTypingIndicator() {
    typingIndicator.style.display = 'inline-flex';
  }
  function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
  }

  // ===== 整形用関数 =====
  // **～** の強調表示、箇条書き(- )、改行 を HTML に変換
  function formatLLMOutput(text) {
    // 1. **text** → <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. 改行と箇条書きの変換
    const lines = formatted.split('\n');
    let result = '';
    let inList = false;

    lines.forEach(line => {
      if (line.trim().startsWith('- ')) {
        if (!inList) {
          result += '<ul>';
          inList = true;
        }
        const listItem = line.trim().substring(2);
        result += '<li>' + listItem + '</li>';
      } else {
        if (inList) {
          result += '</ul>';
          inList = false;
        }
        result += line + '<br>';
      }
    });
    if (inList) {
      result += '</ul>';
    }
    return result;
  }

  // ===== メッセージ表示 =====
  // ユーザーメッセージ（生テキスト）
  function renderUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.textContent = text;
    messageDiv.style.animation = 'floatUp 0.5s ease-out';
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 生テキストとして保存
    saveMessageToLocalStorage(text, 'user');
  }

  // ボットメッセージを部分的に整形しながら表示（最終的に生テキストを保存）
  function animateBotMessage(originalText) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'bot-message';
    chatMessages.appendChild(messageDiv);

    let index = 0;
    let rawText = '';

    // 生成速度パラメータ
    const chunkSize = 7;     // 一度に表示する文字数
    const intervalMs = 100;  // 何msごとに次のchunkを表示

    const intervalId = setInterval(() => {
      if (index >= originalText.length) {
        clearInterval(intervalId);

        // 全文取得完了時 → 画面は整形して表示しつつ、保存は生テキストのまま
        messageDiv.innerHTML = formatLLMOutput(rawText);

        // ローカルストレージにも「生テキスト」を保存
        saveMessageToLocalStorage(rawText, 'bot');
        return;
      }

      // 次のchunkを取り出し
      const chunk = originalText.substr(index, chunkSize);
      rawText += chunk;
      index += chunkSize;

      // 部分的に整形して表示
      const partialHTML = formatLLMOutput(rawText);
      messageDiv.innerHTML = partialHTML;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, intervalMs);
  }

  // 履歴表示時は、生テキストを受け取って整形し表示
  function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    if (sender === 'user') {
      messageDiv.className = 'user-message';
      messageDiv.textContent = text;
    } else {
      messageDiv.className = 'bot-message';
      // 生テキストをその場でフォーマット
      messageDiv.innerHTML = formatLLMOutput(text);
    }
    chatMessages.appendChild(messageDiv);
  }

  // ===== ローカルストレージ保存 =====
  function saveMessageToLocalStorage(text, sender) {
    if (!currentChatRoomId) return;
    const key = `chatHistory_${currentChatRoomId}`;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      history = [];
    }
    // text は常に生テキスト（user, bot共通）
    history.push({ text: text, sender: sender });
    localStorage.setItem(key, JSON.stringify(history));
  }

  // ------------------------
  // 以下、チャットルーム管理用のAPI呼び出し等
  // ------------------------
  function createNewChatRoom(roomId, title) {
    return fetch("/api/new_chat_room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roomId, title })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          return Promise.reject(data.error);
        }
        return data;
      });
  }

  function deleteChatRoom(roomId) {
    fetch("/api/delete_chat_room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert("削除失敗: " + data.error);
        } else {
          if (roomId === currentChatRoomId) {
            currentChatRoomId = null;
            chatMessages.innerHTML = '';
            localStorage.removeItem('currentChatRoomId');
          }
          loadChatRooms();
        }
      })
      .catch(err => {
        alert("削除失敗: " + err.toString());
      });
  }

  function renameChatRoom(roomId, newTitle) {
    fetch("/api/rename_chat_room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId, new_title: newTitle })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert("名前変更失敗: " + data.error);
        } else {
          loadChatRooms();
        }
      })
      .catch(err => {
        alert("名前変更失敗: " + err.toString());
      });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.room-actions-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  });
});
