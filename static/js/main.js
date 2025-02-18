// main.js


document.addEventListener('DOMContentLoaded', () => {
  // ログイン状態をAPIで確認し、左上ボタンの表示を切り替え
  fetch("/api/current_user")
    .then(res => res.json())
    .then(data => {
      const settingsBtn = document.getElementById("settings-btn");
      if (data.logged_in) {
        // ログイン中の場合はユーザーアイコンを表示し、クリックでメニューをトグル
        settingsBtn.innerHTML = '<i class="bi bi-person-circle"></i>';
        settingsBtn.title = "ユーザー";
        settingsBtn.onclick = toggleUserMenu;
      } else {
        // 未ログインの場合は「ログイン」と表示し、クリックでログインページへ遷移
        settingsBtn.innerHTML = "ログイン";
        settingsBtn.title = "ログイン";
        settingsBtn.onclick = () => {
          window.location.href = "/login";
        };
      }
    })
    .catch(err => console.error("Error checking login status:", err));

  // すでにlocalStorageに currentChatRoomId があれば復元
  if (localStorage.getItem('currentChatRoomId')) {
    currentChatRoomId = localStorage.getItem('currentChatRoomId');
  }

  // タスクカードや「もっと見る」ボタンの初期化
  initToggleTasks();
  initSetupTaskCards();

  // 初期表示はセットアップフォーム
  showSetupForm();
  // サイドバーのチャットルーム一覧を更新
  loadChatRooms();

  // ページ復帰時に currentChatRoomId があればチャット履歴をロード
  if (currentChatRoomId) {
    showChatInterface();
    loadLocalChatHistory();
  }

  // 新規チャットボタン
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
    loadChatHistory();
  });

  // 送信ボタン
  sendBtn.addEventListener('click', sendMessage);

  // Enterキーで送信（Shift+Enterは改行）
  userInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // テキストエリアの自動高さ調整
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  // 戻るボタン（セットアップ画面に戻る）
  backToSetupBtn.addEventListener('click', showSetupForm);

  // 画面クリック時に、他のアクションメニュー（3点アイコン）を閉じる
  document.addEventListener('click', () => {
    document.querySelectorAll('.room-actions-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  });
});

// ユーザーメニューの表示/非表示を切り替える関数
function toggleUserMenu() {
  let menu = document.getElementById("user-menu");

  if (!menu) {
    // メニューコンテナの作成
    menu = document.createElement("div");
    menu.id = "user-menu";
    menu.style.position = "absolute";
    menu.style.top = "50px"; // 少し上に調整
    menu.style.left = "10px";
    menu.style.backgroundColor = "#fff";
    menu.style.border = "1px solid #ddd";
    menu.style.borderRadius = "6px";
    menu.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    menu.style.zIndex = "1001";
    menu.style.minWidth = "150px";
    menu.style.overflow = "hidden";

    // メニュー項目の作成（設定・ログアウト）
    menu.innerHTML = `
      <div id="menu-settings" style="
          padding: 8px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #007bff;
          font-weight: bold;
          font-size: 14px;
          border-bottom: 1px solid #ddd;
          background-color: #f9f9f9;
        ">
        <i class="bi bi-gear" style="margin-right: 6px; font-size: 16px;"></i>
        設定
      </div>
      <div id="menu-logout" style="
          padding: 8px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #dc3545;
          font-weight: bold;
          font-size: 14px;
          background-color: #f9f9f9;
        ">
        <i class="bi bi-box-arrow-right" style="margin-right: 6px; font-size: 16px;"></i>
        ログアウト
      </div>
    `;

    document.body.appendChild(menu);

    // 各項目のクリック処理
    document.getElementById("menu-settings").addEventListener("click", () => {
      window.location.href = "/settings";
    });

    document.getElementById("menu-logout").addEventListener("click", () => {
      window.location.href = "/logout";
    });

    // ホバー時のスタイル変更
    const settingsItem = document.getElementById("menu-settings");
    const logoutItem = document.getElementById("menu-logout");

    settingsItem.addEventListener("mouseover", function() {
      settingsItem.style.backgroundColor = "#e6f0ff"; // ホバー時は淡い青
    });
    settingsItem.addEventListener("mouseout", function() {
      settingsItem.style.backgroundColor = "#f9f9f9";
    });

    logoutItem.addEventListener("mouseover", function() {
      logoutItem.style.backgroundColor = "#ffe6e6"; // ホバー時は淡い赤
    });
    logoutItem.addEventListener("mouseout", function() {
      logoutItem.style.backgroundColor = "#f9f9f9";
    });

    // 設定ボタンおよびメニュー外クリックでメニューを非表示にする
    document.addEventListener("click", function docClick(e) {
      const settingsBtn = document.getElementById("settings-btn");
      if (!menu.contains(e.target) && !settingsBtn.contains(e.target)) {
        menu.style.display = "none";
      }
    });
  }

  // メニューの表示／非表示をトグル
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}
