// tasks_edit_modal.js

import { updateTaskTitle } from './tasks_name_update.js';
import { currentEditingCard } from './tasks_order.js';

export function showModal(modalEl) {
  modalEl.style.display = 'flex';
}

export function hideModal(modalEl) {
  modalEl.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  const modalEl  = document.getElementById('taskEditModal');
  const closeBtn = document.getElementById('closeTaskEditModal');
  const cancelBtn= document.getElementById('cancelTaskEditModal');
  const saveBtn  = document.getElementById('saveTaskChanges');

  // モーダルの閉じる操作
  closeBtn?.addEventListener('click',  () => hideModal(modalEl));
  cancelBtn?.addEventListener('click', () => hideModal(modalEl));

  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    // 1. モーダル内の入力値取得
    const taskName       = document.getElementById('taskName').value.trim();
    const promptTemplate = document.getElementById('promptTemplate').value.trim();
    const inputExamples  = document.getElementById('inputExamples').value.trim();
    const outputExamples = document.getElementById('outputExamples').value.trim();

    // 2. 編集前のタスク名を dataset から取得
    const oldTask = currentEditingCard.dataset.task;

    // 3. サーバー送信用ペイロード
    const payload = {
      old_task:        oldTask,
      new_task:        taskName,
      prompt_template: promptTemplate,
      input_examples:  inputExamples,
      output_examples: outputExamples
    };

    // 4. API 呼び出し
    fetch('/api/edit_task', {
      method:      'POST',
      credentials: 'same-origin',             // Cookie を送信
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(payload)
    })
    .then(response => {
      const ct = response.headers.get('Content-Type') || '';
      if (ct.includes('application/json')) {
        // 正常 or JSON エラー(JSON.stringify された {"error":...})
        return response.json().then(data => {
          if (!response.ok) throw new Error(data.error || '更新に失敗しました');
          return data;
        });
      } else {
        // HTML の 500 ページなどが返ってきた場合
        return response.text().then(text => {
          console.error('非JSONレスポンス:', text);
          throw new Error(`サーバーエラー: ${response.status}`);
        });
      }
    })
    .then(() => {
      // 5. 成功したら data- 属性を更新
      const card = currentEditingCard;
      card.dataset.task            = taskName;
      card.dataset.prompt_template = promptTemplate;
      card.dataset.input_examples  = inputExamples;
      card.dataset.output_examples = outputExamples;

      // 6. タイトルを書き換え
      updateTaskTitle(card, taskName);

      // 7. モーダル閉じる
      hideModal(modalEl);
    })
    .catch(error => {
      alert("更新に失敗しました: " + error.message);
      console.error("edit_task error:", error);
    });
  });
});
