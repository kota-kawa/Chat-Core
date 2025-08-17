// my_prompts.js
document.addEventListener("DOMContentLoaded", function() {
  // ユーザーが投稿したプロンプト一覧を取得して表示する関数
  function truncateTitle(title) {
    const chars = Array.from(title);
    return chars.length > 17 ? chars.slice(0, 17).join('') + '...' : title;
  }

  function loadMyPrompts() {
    fetch('/prompt_manage/api/my_prompts')
      .then(response => response.json())
      .then(data => {
        const promptList = document.getElementById("promptList");
        promptList.innerHTML = '';
        if(data.prompts && data.prompts.length > 0) {
          data.prompts.forEach(prompt => {
            const card = document.createElement("div");
            card.classList.add("prompt-card");
            card.innerHTML = `
              <h3>${truncateTitle(prompt.title)}</h3>
              <p>${prompt.content}</p>
              <div class="meta">
                <span>カテゴリ: ${prompt.category}</span><br>
                <span>投稿日: ${new Date(prompt.created_at).toLocaleString()}</span>
              </div>
              <!-- 隠し要素として入力例と出力例を保持 -->
              <p class="d-none input-examples">${prompt.input_examples || ''}</p>
              <p class="d-none output-examples">${prompt.output_examples || ''}</p>
              <div class="btn-group">
                <button class="btn btn-sm btn-warning edit-btn" data-id="${prompt.id}">
                  <i class="bi bi-pencil"></i> 編集
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${prompt.id}">
                  <i class="bi bi-trash"></i> 削除
                </button>
              </div>
            `;
            promptList.appendChild(card);
          });
          attachEventHandlers();
        } else {
          promptList.innerHTML = '<p>プロンプトが存在しません。</p>';
        }
      })
      .catch(err => {
        console.error("プロンプト取得エラー:", err);
        document.getElementById("promptList").innerHTML = '<p>プロンプトの読み込み中にエラーが発生しました。</p>';
      });
  }

  // 各カードの「編集」「削除」ボタンにイベントを付与する関数
  function attachEventHandlers() {
    // 削除ボタンのイベント
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(btn => {
      btn.addEventListener("click", function() {
        const promptId = this.getAttribute("data-id");
        if(confirm("本当にこのプロンプトを削除しますか？")) {
          fetch(`/prompt_manage/api/prompts/${promptId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          .then(response => response.json())
          .then(result => {
            if(result.error) {
              alert("削除エラー: " + result.error);
            } else {
              alert(result.message);
              loadMyPrompts();
            }
          })
          .catch(err => {
            console.error("削除中のエラー:", err);
            alert("プロンプトの削除中にエラーが発生しました。");
          });
        }
      });
    });

    // 編集ボタンのイベント
    const editButtons = document.querySelectorAll(".edit-btn");
    editButtons.forEach(btn => {
      btn.addEventListener("click", function() {
        const promptId = this.getAttribute("data-id");
        const card = this.closest(".prompt-card");
        const title = card.querySelector("h3").textContent;
        const content = card.querySelector("p").textContent;
        // 「カテゴリ: ○○」というテキストからカテゴリ部分を抽出
        const categoryText = card.querySelector(".meta span").textContent;
        const category = categoryText.replace("カテゴリ: ", "");
        const inputExamples = card.querySelector(".input-examples") ? card.querySelector(".input-examples").textContent : '';
        const outputExamples = card.querySelector(".output-examples") ? card.querySelector(".output-examples").textContent : '';
        
        // 編集フォームに現在値をセット
        document.getElementById("editPromptId").value = promptId;
        document.getElementById("editTitle").value = title;
        document.getElementById("editCategory").value = category;
        document.getElementById("editContent").value = content;
        document.getElementById("editInputExamples").value = inputExamples;
        document.getElementById("editOutputExamples").value = outputExamples;
        
        // Bootstrap の Modal を利用してモーダル表示
        const editModal = new bootstrap.Modal(document.getElementById("editModal"));
        editModal.show();
      });
    });
  }

  // 編集フォームの送信（更新）処理
  const editForm = document.getElementById("editForm");
  editForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const promptId = document.getElementById("editPromptId").value;
    const title = document.getElementById("editTitle").value;
    const category = document.getElementById("editCategory").value;
    const content = document.getElementById("editContent").value;
    const inputExamples = document.getElementById("editInputExamples").value;
    const outputExamples = document.getElementById("editOutputExamples").value;
    
    fetch(`/prompt_manage/api/prompts/${promptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, category, content, input_examples: inputExamples, output_examples: outputExamples })
    })
    .then(response => response.json())
    .then(result => {
      if(result.error) {
        alert("更新エラー: " + result.error);
      } else {
        alert(result.message);
        // モーダルを閉じて一覧を再読み込み
        const editModalEl = document.getElementById("editModal");
        const modal = bootstrap.Modal.getInstance(editModalEl);
        modal.hide();
        loadMyPrompts();
      }
    })
    .catch(err => {
      console.error("更新中のエラー:", err);
      alert("プロンプトの更新中にエラーが発生しました。");
    });
  });

  // 初期ロード
  loadMyPrompts();
});
