// user_settings.js
// -----------------------------------------------
//  ユーザー設定フォーム (プロフィール取得／更新)
// -----------------------------------------------
export {};
document.addEventListener('DOMContentLoaded', () => {
  const changeBtn   = document.getElementById('changeAvatarBtn');  // 画像変更ボタン
  const fileInput   = document.getElementById('avatarInput');      // file 要素
  const previewImg  = document.getElementById('avatarPreview');    // プレビュー
  const togglePwd   = document.getElementById('togglePasswordBtn');// パスワード表示切替
  const cancelBtn   = document.getElementById('cancelBtn');        // キャンセル
  const form        = document.getElementById('userSettingsForm'); // フォーム本体

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

  // 初期表示時に現在のプロフィールを読み込む
  loadProfile();
});
