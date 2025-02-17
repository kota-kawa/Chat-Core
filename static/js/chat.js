// chat.js

// 現在のチャットルームIDを保持
window.currentChatRoomId = null;

// チャット画面を表示
function showChatInterface() {
  setupContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
  if (!currentChatRoomId && localStorage.getItem('currentChatRoomId')) {
    currentChatRoomId = localStorage.getItem('currentChatRoomId');
  }
}

// チャットルーム一覧を取得してサイドバーに表示
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

      // 各チャットルームカードの生成
      rooms.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'chat-room-card';
        if (room.id === currentChatRoomId) {
          roomEl.classList.add('active');
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = room.title || '新規チャット';

        // アクションアイコン（トグルボタン）の作成
        const actionsIcon = document.createElement('i');
        actionsIcon.className = 'bi bi-three-dots-vertical room-actions-icon';
        actionsIcon.style.cursor = 'pointer';
        actionsIcon.style.fontSize = '18px';

        // リデザインしたアクションメニューの作成
        const actionsMenu = document.createElement('div');
        actionsMenu.className = 'room-actions-menu';
        actionsMenu.style.position = 'absolute';
        actionsMenu.style.top = '50%';
        actionsMenu.style.right = '0';
        actionsMenu.style.transform = 'translateY(-50%)';
        actionsMenu.style.backgroundColor = '#fff';
        actionsMenu.style.border = '1px solid #ddd';
        actionsMenu.style.borderRadius = '6px';
        actionsMenu.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        actionsMenu.style.zIndex = '10';
        actionsMenu.style.minWidth = '140px';
        actionsMenu.style.overflow = 'hidden';
        actionsMenu.style.display = 'none';

        // 「名前変更」項目
        const renameItem = document.createElement('div');
        renameItem.className = 'menu-item';
        renameItem.style.padding = '8px 16px';
        renameItem.style.cursor = 'pointer';
        renameItem.style.display = 'flex';
        renameItem.style.alignItems = 'center';
        renameItem.style.fontSize = '14px';
        renameItem.style.color = '#007bff';
        renameItem.style.backgroundColor = '#f9f9f9';
        renameItem.style.borderBottom = '1px solid #ddd';
        renameItem.innerHTML = `<i class="bi bi-pencil-square" style="margin-right: 6px; font-size: 16px;"></i> 名前変更`;
        renameItem.addEventListener("mouseover", () => {
          renameItem.style.backgroundColor = "#e6f0ff";
        });
        renameItem.addEventListener("mouseout", () => {
          renameItem.style.backgroundColor = "#f9f9f9";
        });
        renameItem.addEventListener("click", (e) => {
          e.stopPropagation();
          actionsMenu.style.display = "none";
          const newName = prompt('新しいチャットルーム名を入力', room.title);
          if (newName && newName.trim() !== '') {
            renameChatRoom(room.id, newName.trim());
          }
        });

        // 「削除」項目
        const deleteItem = document.createElement('div');
        deleteItem.className = 'menu-item';
        deleteItem.style.padding = '8px 16px';
        deleteItem.style.cursor = 'pointer';
        deleteItem.style.display = 'flex';
        deleteItem.style.alignItems = 'center';
        deleteItem.style.fontSize = '14px';
        deleteItem.style.color = '#dc3545';
        deleteItem.style.backgroundColor = '#f9f9f9';
        deleteItem.innerHTML = `<i class="bi bi-trash" style="margin-right: 6px; font-size: 16px;"></i> 削除`;
        deleteItem.addEventListener("mouseover", () => {
          deleteItem.style.backgroundColor = "#ffe6e6";
        });
        deleteItem.addEventListener("mouseout", () => {
          deleteItem.style.backgroundColor = "#f9f9f9";
        });
        deleteItem.addEventListener("click", (e) => {
          e.stopPropagation();
          actionsMenu.style.display = "none";
          if (confirm(`「${room.title}」を削除しますか？`)) {
            deleteChatRoom(room.id);
          }
        });

        // アクションメニューに項目を追加
        actionsMenu.appendChild(renameItem);
        actionsMenu.appendChild(deleteItem);

        // アクションアイコンをクリックしたらメニューの表示/非表示を切り替え
        actionsIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          // 他のメニューを閉じる
          document.querySelectorAll('.room-actions-menu').forEach(menu => {
            if (menu !== actionsMenu) {
              menu.style.display = 'none';
            }
          });
          actionsMenu.style.display = (actionsMenu.style.display === 'block') ? 'none' : 'block';
        });

        // チャットルームカード自体のクリック処理（メニュー以外をクリックしたらルーム切替）
        roomEl.addEventListener('click', (e) => {
          if (e.target.closest('.room-actions-icon') || e.target.closest('.room-actions-menu')) {
            return;
          }
          switchChatRoom(room.id);
        });

        // 右側コンテナにアクションアイコンとメニューを配置
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.position = 'relative';
        rightSide.style.marginLeft = 'auto';  // これにより右側に配置される
        rightSide.appendChild(actionsIcon);
        rightSide.appendChild(actionsMenu);

        roomEl.appendChild(titleSpan);
        roomEl.appendChild(rightSide);
        chatRoomListEl.appendChild(roomEl);
      });
    })
    .catch(err => {
      console.error("チャットルーム一覧取得失敗:", err);
    });
}








// チャットルームを切り替える
function switchChatRoom(roomId) {
  currentChatRoomId = roomId;
  localStorage.setItem('currentChatRoomId', currentChatRoomId);
  showChatInterface();
  loadChatRooms();
  loadLocalChatHistory();
  loadChatHistory();
}

// サーバーからチャット履歴を取得して表示（最新情報に更新）
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
        displayMessage(m.message, m.sender);
      });
      // ローカルストレージ更新
      const localKey = `chatHistory_${currentChatRoomId}`;
      const saveArray = serverMessages.map(m => ({ text: m.message, sender: m.sender }));
      localStorage.setItem(localKey, JSON.stringify(saveArray));
    })
    .catch(err => {
      console.error("チャット履歴取得失敗:", err);
    });
}

// ローカルストレージからチャット履歴を読み込み表示
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
    displayMessage(item.text, item.sender);
  });
}

// 送信ボタン押下などで呼ばれるメッセージ送信処理
function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  const aiModel = aiModelSelect.value;
  showTypingIndicator();
  generateResponse(message, aiModel);

  userInput.value = '';
  userInput.style.height = 'auto';
}

// サーバーにメッセージを送り、Botからのレスポンスを受け取る処理
function generateResponse(message, aiModel) {
  // ユーザーのメッセージを即時表示
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

// 取得したテキストをHTML整形する関数
function formatLLMOutput(text) {
  // **テキスト** → <strong>テキスト</strong>
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 改行と箇条書きの変換
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

/**
 * ユーザーメッセージを表示
 */
function renderUserMessage(text) {
  // ラッパ
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';

  // メッセージ本体
  const messageDiv = document.createElement('div');
  messageDiv.className = 'user-message';
  messageDiv.textContent = text;
  messageDiv.style.animation = 'floatUp 0.5s ease-out';

  // コピーボタン
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
      // 2秒後に戻す
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
      }, 2000);
    });
  });

  // 組み立て
  wrapper.appendChild(copyBtn);
  wrapper.appendChild(messageDiv);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  saveMessageToLocalStorage(text, 'user');
}

/**
 * Botメッセージをアニメーション表示
 */
function animateBotMessage(originalText) {
  // ラッパ
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper bot-message-wrapper';

  // メッセージ本体
  const messageDiv = document.createElement('div');
  messageDiv.className = 'bot-message';

  // コピーボタン
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
  copyBtn.addEventListener('click', () => {
    // アニメーション途中でも dataset.fullText の内容をコピー
    navigator.clipboard.writeText(messageDiv.dataset.fullText || '').then(() => {
      copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
      }, 2000);
    });
  });

  wrapper.appendChild(copyBtn);
  wrapper.appendChild(messageDiv);
  chatMessages.appendChild(wrapper);

  let index = 0;
  let rawText = '';

  const chunkSize = 7;
  const intervalMs = 100;

  const intervalId = setInterval(() => {
    if (index >= originalText.length) {
      clearInterval(intervalId);
      messageDiv.innerHTML = formatLLMOutput(rawText);
      saveMessageToLocalStorage(rawText, 'bot');
      return;
    }
    const chunk = originalText.substr(index, chunkSize);
    rawText += chunk;
    index += chunkSize;

    messageDiv.innerHTML = formatLLMOutput(rawText);
    messageDiv.dataset.fullText = rawText;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, intervalMs);
}

/**
 * ローカル/サーバー履歴を描画する一般関数
 */
function displayMessage(text, sender) {
  // ラッパ
  const wrapper = document.createElement('div');
  let copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';

  if (sender === 'user') {
    wrapper.className = 'message-wrapper user-message-wrapper';
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.textContent = text;

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
        }, 2000);
      });
    });

    wrapper.appendChild(copyBtn);
    wrapper.appendChild(messageDiv);
  } else {
    wrapper.className = 'message-wrapper bot-message-wrapper';
    const messageDiv = document.createElement('div');
    messageDiv.className = 'bot-message';
    messageDiv.innerHTML = formatLLMOutput(text);

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
        }, 2000);
      });
    });

    wrapper.appendChild(copyBtn);
    wrapper.appendChild(messageDiv);
  }

  chatMessages.appendChild(wrapper);
}

// ローカルストレージにメッセージを保存
function saveMessageToLocalStorage(text, sender) {
  if (!currentChatRoomId) return;
  const key = `chatHistory_${currentChatRoomId}`;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    history = [];
  }
  history.push({ text: text, sender: sender });
  localStorage.setItem(key, JSON.stringify(history));
}

// 新しいチャットルームをサーバーに作成
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

// チャットルーム削除
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

// チャットルーム名変更
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

// グローバルへエクスポート
window.showChatInterface = showChatInterface;
window.loadChatRooms = loadChatRooms;
window.switchChatRoom = switchChatRoom;
window.loadChatHistory = loadChatHistory;
window.loadLocalChatHistory = loadLocalChatHistory;
window.sendMessage = sendMessage;
window.generateResponse = generateResponse;
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.formatLLMOutput = formatLLMOutput;
window.renderUserMessage = renderUserMessage;
window.animateBotMessage = animateBotMessage;
window.displayMessage = displayMessage;
window.saveMessageToLocalStorage = saveMessageToLocalStorage;
window.createNewChatRoom = createNewChatRoom;
window.deleteChatRoom = deleteChatRoom;
window.renameChatRoom = renameChatRoom;
