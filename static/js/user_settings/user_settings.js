// user_settings.js
document.addEventListener('DOMContentLoaded', () => {
    // アバター変更ボタン → ファイル選択をトリガー
    const changeBtn = document.getElementById('changeAvatarBtn');
    const fileInput = document.getElementById('avatarInput');
    const previewImg = document.getElementById('avatarPreview');
  
    changeBtn.addEventListener('click', () => fileInput.click());
  
    // ファイル選択後にプレビュー更新
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => previewImg.src = reader.result;
        reader.readAsDataURL(file);
      }
    });
  
    // パスワード表示／非表示切り替え
    const togglePwdBtn = document.getElementById('togglePasswordBtn');
    togglePwdBtn.addEventListener('click', () => {
      const pwd = document.getElementById('password');
      const isPwd = pwd.type === 'password';
      pwd.type = isPwd ? 'text' : 'password';
      togglePwdBtn.innerHTML = isPwd
        ? '<i class="bi bi-eye-slash"></i>'
        : '<i class="bi bi-eye"></i>';
    });
  
    // キャンセル → フォームリセット
    document.getElementById('cancelBtn').addEventListener('click', () => {
      const form = document.getElementById('userSettingsForm');
      form.reset();
      previewImg.src = '/static/default-avatar.png';
      togglePwdBtn.innerHTML = '<i class="bi bi-eye"></i>';
    });
  });
  