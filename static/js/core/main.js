/**
 * main.js
 *
 * ■ ページ初期化（DOMContentLoaded）
 *   - ログイン状態を /api/current_user で確認し、設定ボタンを「ログイン／ユーザーアイコン」に切替
 *   - localStorage から前回の currentChatRoomId を復元
 *   - タスクカードと「もっと見る」ボタンの初期化 (initToggleTasks / initSetupTaskCards)
 *   - 最初はセットアップ画面を表示し、チャットルーム一覧をロード
 *   - 復帰時にチャット履歴をロード（ローカル＋サーバー）
 *
 * ■ UI 操作のイベント登録
 *   - 新規チャット／これまでのチャットを見る／送信／Enter 送信
 *   - テキストエリアの自動高さ調整
 *   - 「戻る」ボタンでセットアップ画面へ
 *   - 画面クリックでチャットルームの３点メニューを閉じる
 *
 * ■ ユーザーメニュー表示 toggleUserMenu()
 *   - 「設定」「ログアウト」メニューを動的生成・表示・非表示
 */


function notifyAuthState(loggedIn) {
  window.loggedIn = loggedIn;
  document.dispatchEvent(new CustomEvent('authstatechange', {
    detail: { loggedIn }
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  const authButtons   = document.getElementById("auth-buttons");
  const newPromptBtn  = document.getElementById("openNewPromptModal");
  const accessChatBtn = document.getElementById("access-chat-btn");
  const userIconEl    = document.getElementById('userIcon');
  const loginBtn      = document.getElementById("login-btn");

  const applyAuthUI = loggedIn => {
    if (!authButtons || !newPromptBtn || !accessChatBtn || !userIconEl) return;

    if (loggedIn) {
      // ログイン時：認証ボタンは隠し、ユーザーアイコンを表示
      authButtons.style.display = "none";
      userIconEl.style.display  = "";

      newPromptBtn.style.display  = "";
      accessChatBtn.style.display = "";

      if (window.initTaskOrderEditing) {
        window.initTaskOrderEditing();
      }
    } else {
      // 未ログイン時：認証ボタンだけ表示、ユーザーアイコンは隠す
      authButtons.style.display = "";
      userIconEl.style.display  = "none";

      if (loginBtn) {
        loginBtn.onclick = () => {
          window.location.href = "/login";
        };
      }

      // タスク編集ボタンが残っていたら削除
      const editBtn = document.getElementById('edit-task-order-btn');
      if (editBtn) editBtn.remove();

      // 新規プロンプト＆過去チャット閲覧ボタンを非表示
      newPromptBtn.style.display  = "none";
      accessChatBtn.style.display = "none";
    }
  };

  // ▼ログイン状態確認とUI制御
  fetch("/api/current_user")
    .then(res => res.json())
    .then(data => {
      const loggedIn = !!data.logged_in;
      notifyAuthState(loggedIn);
      applyAuthUI(loggedIn);
    })
    .catch(err => {
      console.error("Error checking login status:", err);
      notifyAuthState(false);
      applyAuthUI(false);
    });

    

  // ▼ローカルに保存されていれば現在のチャットルームを復元
  if (localStorage.getItem('currentChatRoomId'))
    currentChatRoomId = localStorage.getItem('currentChatRoomId');

  // ▼初期化
  initToggleTasks();
  initSetupTaskCards();

  // 初期表示はセットアップ
  showSetupForm();
  loadChatRooms();


  // 新規チャット
  newChatBtn.addEventListener('click', () => {
    currentChatRoomId = null;
    localStorage.removeItem('currentChatRoomId');
    chatMessages.innerHTML = '';
    showSetupForm();
  });

  // 「これまでのチャットを見る」
  accessChatBtn.addEventListener('click', () => {
    fetch('/api/get_chat_rooms')
      .then(res => res.json())
      .then(data => {
        const rooms = data.rooms || [];
        if (rooms.length > 0) {
          // 1件目が最も新しいルームなので切り替え
          switchChatRoom(rooms[0].id);
        } else {
          // ルームがない場合は空のチャット画面を表示
          showChatInterface();
          loadChatRooms();
          chatMessages.innerHTML = '';
        }
      })
      .catch(err => {
        console.error('ルーム一覧取得失敗:', err);
        showChatInterface();
        loadChatRooms();
        chatMessages.innerHTML = '';
      });
  });

  // 送信
  sendBtn.addEventListener('click', sendMessage);

  // Enter 送信 (Shift+Enter で改行)
  userInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // テキストエリア高さ自動調整
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  // 戻るボタン
  backToSetupBtn.addEventListener('click', showSetupForm);

  // 画面クリックでサイドメニューの 3 点メニューを閉じる
  document.addEventListener('click', () => {
    document.querySelectorAll('.room-actions-menu')
            .forEach(menu => menu.style.display = 'none');
  });
});

/* ▼ユーザーメニュー（設定 / ログアウト） ---------------------------------------*/
function toggleUserMenu() {
  let menu = document.getElementById("user-menu");

  if (!menu) {
    // メニュー要素を生成
    menu = document.createElement("div");
    menu.id = "user-menu";

    // スタイル設定（モバイル時は static、PC時は右上絶対配置）
    Object.assign(menu.style, {
      position:    "absolute",
      top:         "60px",    // 設定アイコン下に 10px マージン
      right:       "10px",
      background:  "#fff",
      border:      "1px solid #ddd",
      borderRadius:"6px",
      boxShadow:   "0 2px 4px rgba(0,0,0,.1)",
      zIndex:      "1001",
      minWidth:    "150px",
      overflow:    "hidden"
    });

    document.body.appendChild(menu);

    // メニュー内容
    menu.innerHTML = `
      <div id="menu-settings" style="
           padding:8px 16px; cursor:pointer; display:flex; align-items:center;
           color:#007bff; font-weight:bold; font-size:14px; border-bottom:1px solid #ddd;
           background:#f9f9f9;">
        <i class="bi bi-gear" style="margin-right:6px;font-size:16px;"></i> 設定
      </div>
      <div id="menu-logout" style="
           padding:8px 16px; cursor:pointer; display:flex; align-items:center;
           color:#dc3545; font-weight:bold; font-size:14px; background:#f9f9f9;">
        <i class="bi bi-box-arrow-right" style="margin-right:6px;font-size:16px;"></i> ログアウト
      </div>`;

    // イベント登録
    document.getElementById("menu-settings").addEventListener("click", () => {
      window.location.href = "/settings";
    });
    document.getElementById("menu-logout").addEventListener("click", () => {
      window.location.href = "/logout";
    });

    const [settingsItem, logoutItem] = [
      document.getElementById("menu-settings"),
      document.getElementById("menu-logout")
    ];
    settingsItem.addEventListener("mouseover", () => {
      settingsItem.style.background = "#e6f0ff";
    });
    settingsItem.addEventListener("mouseout", () => {
      settingsItem.style.background = "#f9f9f9";
    });
    logoutItem.addEventListener("mouseover", () => {
      logoutItem.style.background = "#ffe6e6";
    });
    logoutItem.addEventListener("mouseout", () => {
      logoutItem.style.background = "#f9f9f9";
    });

    // メニュー外クリックで非表示
    document.addEventListener("click", function docClick(e) {
      const btn = document.getElementById("settings-btn");
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  // 表示/非表示トグル
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

