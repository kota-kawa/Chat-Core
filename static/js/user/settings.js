// settings.js
// -----------------------------------------------
//  ユーザー設定フォーム (プロフィール取得／更新)
//  + サイドバーナビゲーション
//  + プロンプト管理機能
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const changeBtn   = document.getElementById('changeAvatarBtn');  // 画像変更ボタン
  const fileInput   = document.getElementById('avatarInput');      // file 要素
  const previewImg  = document.getElementById('avatarPreview');    // プレビュー
  const togglePwd   = document.getElementById('togglePasswordBtn');// パスワード表示切替
  const cancelBtn   = document.getElementById('cancelBtn');        // キャンセル
  const form        = document.getElementById('userSettingsForm'); // フォーム本体

  // ─────────────────────────── 
  // サイドバーナビゲーション
  // ─────────────────────────── 
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.settings-section');
  const savedPromptListEl = document.getElementById('savedPromptList');
  const promptListEntriesEl = document.getElementById('promptListEntries');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // アクティブなリンクを更新
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // 対応するセクションを表示
      const targetSection = link.dataset.section;
      sections.forEach(section => {
        if (section.id === `${targetSection}-section`) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
      
      // プロンプト管理セクションがアクティブになった時にプロンプトを読み込む
      if (targetSection === 'prompts') {
        loadMyPrompts();
      } else if (targetSection === 'saved-prompts') {
        loadSavedPrompts();
      } else if (targetSection === 'prompt-list') {
        loadPromptList();
      }
    });
  });

  // ─────────────────────────── 
  // プロフィール設定機能
  // ─────────────────────────── 

  /* ───────── 画像選択 → プレビュー ───────── */
  changeBtn?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => (previewImg.src = reader.result);
      reader.readAsDataURL(file);
    }
  });

  /* ───────── パスワード表示／非表示 ───────── */
  togglePwd?.addEventListener('click', () => {
    const pwd = document.getElementById('password');
    const isPwd = pwd.type === 'password';
    pwd.type = isPwd ? 'text' : 'password';
    togglePwd.innerHTML = isPwd
      ? '<i class="bi bi-eye-slash"></i>'
      : '<i class="bi bi-eye"></i>';
  });

  /* ───────── キャンセル → フォームリセット ───────── */
  cancelBtn?.addEventListener('click', () => {
    form.reset();
    previewImg.src = '/static/user-icon.png';          // デフォルト画像
    togglePwd.innerHTML = '<i class="bi bi-eye"></i>'; // アイコン戻す
  });

  /* ───────── プロフィール取得 ───────── */
  async function loadProfile() {
    try {
      const res  = await fetch('/api/user/profile', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取得失敗');

      document.getElementById('username').value = data.username ?? '';
      document.getElementById('email').value    = data.email    ?? '';
      document.getElementById('bio').value      = data.bio      ?? '';
      if (data.avatar_url) previewImg.src = data.avatar_url;
    } catch (err) {
      console.error('loadProfile:', err.message);
    }
  }

  /* ───────── プロフィール更新 ───────── */
  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const fd = new FormData();
    fd.append('username', document.getElementById('username').value.trim());
    fd.append('email',    document.getElementById('email').value.trim());
    fd.append('bio',      document.getElementById('bio').value.trim());
    if (fileInput.files.length > 0) fd.append('avatar', fileInput.files[0]);

    try {
      const res   = await fetch('/api/user/profile', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const ctype = res.headers.get('Content-Type') || '';
      const body  = ctype.includes('application/json')
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) throw new Error(body.error || '更新失敗');
      alert(body.message || 'プロフィールを更新しました');
      if (body.avatar_url) previewImg.src = body.avatar_url;  // 新画像を即反映
    } catch (err) {
      alert('エラー: ' + err.message);
    }
  });

  // ─────────────────────────── 
  // プロンプト管理機能
  // ─────────────────────────── 

  // タイトル切り詰め関数
  function truncateTitle(title) {
    const chars = Array.from(title);
    return chars.length > 17 ? chars.slice(0, 17).join('') + '...' : title;
  }

  // プロンプト一覧読み込み
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

  function attachSavedPromptHandlers() {
    if (!savedPromptListEl) return;

    savedPromptListEl.querySelectorAll('.remove-saved-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const promptId = this.dataset.id;
        if (!promptId) return;
        if (!confirm('保存したプロンプトを削除しますか？')) return;

        fetch(`/prompt_manage/api/saved_prompts/${promptId}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        })
          .then(response => response.json())
          .then(result => {
            if (result.error) {
              alert('削除エラー: ' + result.error);
            } else {
              alert(result.message || '保存したプロンプトを削除しました。');
              loadSavedPrompts();
            }
          })
          .catch(err => {
            console.error('保存したプロンプトの削除中にエラーが発生しました:', err);
            alert('保存したプロンプトの削除中にエラーが発生しました。');
          });
      });
    });
  }

  function attachPromptListHandlers() {
    if (!promptListEntriesEl) return;

    promptListEntriesEl.querySelectorAll('.remove-prompt-list-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const entryId = this.dataset.id;
        if (!entryId) return;
        if (!confirm('プロンプトリストから削除しますか？')) return;

        fetch(`/prompt_manage/api/prompt_list/${entryId}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        })
          .then(response => response.json())
          .then(result => {
            if (result.error) {
              alert('削除エラー: ' + result.error);
            } else {
              alert(result.message || 'プロンプトを削除しました。');
              loadPromptList();
            }
          })
          .catch(err => {
            console.error('プロンプトリストの削除中にエラーが発生しました:', err);
            alert('プロンプトリストの削除中にエラーが発生しました。');
          });
      });
    });
  }

  function loadSavedPrompts() {
    if (!savedPromptListEl) return;

    savedPromptListEl.innerHTML = '<p>読み込み中...</p>';

    fetch('/prompt_manage/api/saved_prompts', {
      credentials: 'same-origin'
    })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || '保存したプロンプトの取得に失敗しました。');
        }
        return data;
      })
      .then(data => {
        if (!data.prompts || data.prompts.length === 0) {
          savedPromptListEl.innerHTML = '<p>保存したプロンプトは存在しません。</p>';
          return;
        }

        savedPromptListEl.innerHTML = '';
        data.prompts.forEach(prompt => {
          const card = document.createElement('div');
          card.classList.add('prompt-card');

          const createdAt = prompt.created_at
            ? new Date(prompt.created_at).toLocaleString()
            : '';

          card.innerHTML = `
            <h3>${truncateTitle(prompt.name)}</h3>
            <p>${prompt.prompt_template}</p>
            ${prompt.input_examples ? `<div class="meta"><strong>入力例:</strong> ${prompt.input_examples}</div>` : ''}
            ${prompt.output_examples ? `<div class="meta"><strong>出力例:</strong> ${prompt.output_examples}</div>` : ''}
            <div class="meta">
              <span>保存日: ${createdAt}</span>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-danger remove-saved-btn" data-id="${prompt.id}">
                <i class="bi bi-trash"></i> 削除
              </button>
            </div>
          `;

          savedPromptListEl.appendChild(card);
        });

        attachSavedPromptHandlers();
      })
      .catch(err => {
        console.error('保存したプロンプト取得エラー:', err);
        savedPromptListEl.innerHTML = `<p>${err.message}</p>`;
      });
  }

  function loadPromptList() {
    if (!promptListEntriesEl) return;

    promptListEntriesEl.innerHTML = '<p>読み込み中...</p>';

    fetch('/prompt_manage/api/prompt_list', {
      credentials: 'same-origin'
    })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'プロンプトリストの取得に失敗しました。');
        }
        return data;
      })
      .then(data => {
        if (!data.prompts || data.prompts.length === 0) {
          promptListEntriesEl.innerHTML = '<p>プロンプトリストは存在しません。</p>';
          return;
        }

        promptListEntriesEl.innerHTML = '';
        data.prompts.forEach(entry => {
          const card = document.createElement('div');
          card.classList.add('prompt-card');

          const createdAt = entry.created_at
            ? new Date(entry.created_at).toLocaleString()
            : '';

          card.innerHTML = `
            <h3>${truncateTitle(entry.title)}</h3>
            <p>${entry.content}</p>
            ${entry.category ? `<div class="meta"><strong>カテゴリ:</strong> ${entry.category}</div>` : ''}
            ${entry.input_examples ? `<div class="meta"><strong>入力例:</strong> ${entry.input_examples}</div>` : ''}
            ${entry.output_examples ? `<div class="meta"><strong>出力例:</strong> ${entry.output_examples}</div>` : ''}
            <div class="meta">
              <span>保存日: ${createdAt}</span>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-danger remove-prompt-list-btn" data-id="${entry.id}">
                <i class="bi bi-trash"></i> 削除
              </button>
            </div>
          `;

          promptListEntriesEl.appendChild(card);
        });

        attachPromptListHandlers();
      })
      .catch(err => {
        console.error('プロンプトリスト取得エラー:', err);
        promptListEntriesEl.innerHTML = `<p>${err.message}</p>`;
      });
  }

  // 編集・削除ボタンのイベントハンドラー追加
  function attachEventHandlers() {
    // 編集ボタン
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const promptId = this.dataset.id;
        const card = this.closest(".prompt-card");
        
        // カードから情報を取得
        const title = card.querySelector("h3").textContent;
        const content = card.querySelector("p").textContent;
        const metaSpans = card.querySelectorAll(".meta span");
        const category = metaSpans[0].textContent.replace("カテゴリ: ", "");
        const inputExamples = card.querySelector(".input-examples").textContent;
        const outputExamples = card.querySelector(".output-examples").textContent;
        
        // モーダルフォームに値をセット
        document.getElementById("editPromptId").value = promptId;
        document.getElementById("editTitle").value = title;
        document.getElementById("editCategory").value = category;
        document.getElementById("editContent").value = content;
        document.getElementById("editInputExamples").value = inputExamples;
        document.getElementById("editOutputExamples").value = outputExamples;
        
        // モーダルを表示
        const editModal = new bootstrap.Modal(document.getElementById("editModal"));
        editModal.show();
      });
    });

    // 削除ボタン
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const promptId = this.dataset.id;
        if(confirm("このプロンプトを削除しますか？")) {
          fetch(`/prompt_manage/api/prompts/${promptId}`, {
            method: 'DELETE'
          })
          .then(response => response.json())
          .then(result => {
            if(result.error) {
              alert("削除エラー: " + result.error);
            } else {
              alert(result.message);
              loadMyPrompts(); // 一覧を再読み込み
            }
          })
          .catch(err => {
            console.error("削除中のエラー:", err);
            alert("プロンプトの削除中にエラーが発生しました。");
          });
        }
      });
    });
  }

  // 編集フォームの送信処理
  const editForm = document.getElementById("editForm");
  editForm?.addEventListener("submit", function(e) {
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

  // 初期表示時に現在のプロフィールを読み込む
  loadProfile();
});