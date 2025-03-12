// tasks_order.js

let isEditingOrder = false;
let editButton;
let draggingTask = null;
let taskPlaceholder = null;
let taskOffsetX = 0;
let taskOffsetY = 0;

// タスクカード読み込み後に並び替え編集ボタンを追加する処理
function initTaskOrderEditing() {
  // ヘッダー要素を取得
  const header = document.querySelector('.task-selection-header');
  if (!header) return;

  // 既存のボタンがあれば削除
  if (editButton) {
    editButton.remove();
    editButton = null;
  }
  
  // ボタン作成
  editButton = document.createElement('button');
  editButton.id = 'edit-task-order-btn';
  editButton.className = 'primary-button';
  // インライン表示に合わせるため余白は不要
  editButton.style.margin = '0';
  editButton.type = 'button';  // フォーム送信を防止
  // Bootstrapのアイコンをセット（ここでは例としてbi-arrows-moveを使用）
  editButton.innerHTML = '<i class="bi bi-arrows-move"></i>';
  editButton.title = '並び替え編集';  // ツールチップ用

  editButton.addEventListener('click', toggleTaskOrderEditing);
  // ヘッダー内にボタンを追加
  header.appendChild(editButton);
}

// 編集モードの ON/OFF 切替
function toggleTaskOrderEditing() {
  // 編集モードをトグルする
  isEditingOrder = !isEditingOrder;
  window.isEditingOrder = isEditingOrder;

  if (isEditingOrder) {
    // 編集モード開始時：
    // ボタンを押した瞬間にアイコンをチェックマークに変更し、タイトルを「完了」にする
    editButton.title = "完了";
    editButton.innerHTML = '<i class="bi bi-check"></i>';
    
    // タスクカード表示の設定やドラッグ＆ドロップを有効化
    document.querySelectorAll('.task-selection .prompt-card').forEach(card => {
      card.style.display = 'flex';
    });
    const toggleBtn = document.getElementById('toggle-tasks-btn');
    if (toggleBtn) {
      toggleBtn.style.display = 'none';
    }
    enableTaskDragAndDrop();
  } else {
    // 編集モード終了時：
    // チェックマークを押すと、完了として並び順を保存
    disableTaskDragAndDrop();
    saveTaskOrder();
    if (typeof window.initToggleTasks === 'function') {
      window.initToggleTasks();
    }
    // ボタンのアイコンとタイトルを元に戻す
    editButton.title = "並び替え編集";
    editButton.innerHTML = '<i class="bi bi-arrows-move"></i>';
  }
}



// ドラッグ＆ドロップ用イベントを有効化（各カードに .editable クラス追加）
function enableTaskDragAndDrop() {
  const wrappers = document.querySelectorAll('.task-wrapper');
  wrappers.forEach((wrapper, index) => {
    wrapper.classList.add('editable');  // ラッパーに追加
    // 内部のカードにも追加
    const card = wrapper.querySelector('.prompt-card');
    if (card) {
      card.classList.add('editable');
      // 各カードのアニメーション開始タイミングをずらす（例: 0.1秒刻み）
      card.style.animationDelay = `${index * 0.1}s`;
    }
    wrapper.style.touchAction = 'none';
    wrapper.addEventListener('pointerdown', onTaskPointerDown);
  });
}



// イベント解除
function disableTaskDragAndDrop() {
  const wrappers = document.querySelectorAll('.task-wrapper');
  wrappers.forEach(wrapper => {
    wrapper.classList.remove('editable');
    const card = wrapper.querySelector('.prompt-card');
    if (card) {
      card.classList.remove('editable');
    }
    wrapper.removeEventListener('pointerdown', onTaskPointerDown);
  });
  document.removeEventListener('pointermove', onTaskPointerMove);
  document.removeEventListener('pointerup', onTaskPointerUp);
  if (draggingTask) {
    draggingTask.style.position = '';
    draggingTask.style.zIndex = '';
  }
}






// pointerdown イベント
function onTaskPointerDown(e) {
  if (e.button !== 0) return;
  draggingTask = e.currentTarget; // task-wrapper をドラッグ対象にする
  draggingTask.classList.add('dragging');
  const rect = draggingTask.getBoundingClientRect();

  // 絶対配置に変更
  draggingTask.style.position = 'absolute';
  draggingTask.style.width = rect.width + 'px';
  draggingTask.style.height = rect.height + 'px';
  draggingTask.style.zIndex = '1000';

  const container = document.querySelector('.task-selection');
  const containerRect = container.getBoundingClientRect();
  draggingTask.style.left = (e.clientX - containerRect.left - rect.width / 2) + 'px';
  draggingTask.style.top = (e.clientY - containerRect.top - rect.height / 2) + 'px';

  // プレースホルダーを作成（task-wrapper 用）
  taskPlaceholder = document.createElement('div');
  taskPlaceholder.className = 'task-wrapper placeholder';
  taskPlaceholder.style.width = rect.width + 'px';
  taskPlaceholder.style.height = rect.height + 'px';
  taskPlaceholder.style.border = '1px dashed #aaa';
  container.insertBefore(taskPlaceholder, draggingTask.nextSibling);

  document.addEventListener('pointermove', onTaskPointerMove);
  document.addEventListener('pointerup', onTaskPointerUp);
}

function onTaskPointerMove(e) {
  if (!draggingTask) return;
  const container = document.querySelector('.task-selection');
  const containerRect = container.getBoundingClientRect();
  const cardWidth = draggingTask.offsetWidth;
  const cardHeight = draggingTask.offsetHeight;
  draggingTask.style.left = (e.clientX - containerRect.left - cardWidth / 2) + 'px';
  draggingTask.style.top = (e.clientY - containerRect.top - cardHeight / 2) + 'px';

  // プレースホルダーの位置更新（wrapper単位で）
  const wrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.dragging)'));
  let placed = false;
  for (let wrapper of wrappers) {
    const rect = wrapper.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    if (e.clientY < centerY) {
      container.insertBefore(taskPlaceholder, wrapper);
      placed = true;
      break;
    }
  }
  if (!placed) {
    container.appendChild(taskPlaceholder);
  }
}

function onTaskPointerUp(e) {
  if (!draggingTask) return;
  const container = document.querySelector('.task-selection');
  container.insertBefore(draggingTask, taskPlaceholder);
  draggingTask.classList.remove('dragging');
  // スタイルリセット
  draggingTask.style.position = '';
  draggingTask.style.left = '';
  draggingTask.style.top = '';
  draggingTask.style.width = '';
  draggingTask.style.height = '';
  draggingTask.style.zIndex = '';
  taskPlaceholder.remove();
  taskPlaceholder = null;
  draggingTask = null;
  document.removeEventListener('pointermove', onTaskPointerMove);
  document.removeEventListener('pointerup', onTaskPointerUp);
}




// 並び順をサーバーに保存する関数
function saveTaskOrder() {
  const wrappers = document.querySelectorAll('.task-wrapper');
  const newOrder = Array.from(wrappers).map(wrapper => {
    return wrapper.querySelector('.prompt-card').getAttribute('data-task');
  });
  
  fetch('/api/update_tasks_order', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: newOrder })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("並び順の保存に失敗: " + data.error);
    }
  })
  .catch(err => {
    alert("並び順の保存に失敗: " + err.toString());
  });
}


// エクスポート（他のスクリプトから利用できるように）
window.initTaskOrderEditing = initTaskOrderEditing;
