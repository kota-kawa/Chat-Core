// tasks_edit_modal.js

function showModal(modalEl) {
  modalEl.style.display = 'flex';
}

function hideModal(modalEl) {
  modalEl.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  var modalEl = document.getElementById('taskEditModal');
  var closeBtn = document.getElementById('closeTaskEditModal');
  var cancelBtn = document.getElementById('cancelTaskEditModal');
  var saveBtn = document.getElementById('saveTaskChanges');

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      hideModal(modalEl);
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      hideModal(modalEl);
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      // モーダル内の各入力値を取得
      var taskName = document.getElementById('taskName').value.trim();
      var inputExamples = document.getElementById('inputExamples').value.trim();
      var outputExamples = document.getElementById('outputExamples').value.trim();
      
      // 編集前のタスク名（data-task 属性）を取得
      var oldTask = window.currentEditingCard.getAttribute('data-task');
      
      // サーバーへ送信するペイロードを作成（prompt_template は空文字）
      var payload = {
        old_task: oldTask,
        new_task: taskName,
        prompt_template: "",
        input_examples: inputExamples,
        output_examples: outputExamples
      };
      
      // 非同期でサーバーの /api/edit_task エンドポイントにリクエスト
      fetch('/api/edit_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(data => { 
            throw new Error(data.error || 'タスクの更新に失敗しました'); 
          });
        }
        return response.json();
      })
      .then(function(data) {
        // 更新成功時：対象カードの属性を新しい内容に更新
        window.currentEditingCard.setAttribute('data-task', taskName);
        window.currentEditingCard.setAttribute('data-input_examples', inputExamples);
        window.currentEditingCard.setAttribute('data-output_examples', outputExamples);
        
        // 表示されているタスク名も更新（tasks_name_update.js の updateTaskTitle 関数を利用）
        updateTaskTitle(window.currentEditingCard, taskName);
        
        // 更新が完了したらモーダルを閉じる
        hideModal(modalEl);
      })
      .catch(function(error) {
        alert("更新に失敗しました: " + error.message);
      });
    });
  }
});
