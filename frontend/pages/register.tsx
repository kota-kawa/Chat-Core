import Head from "next/head";
import Script from "next/script";
import { useEffect } from "react";

const bodyMarkup = `
<div class="chat-background"></div>
  <div class="auth-container">
    <div class="bot-icon" id="iconDisplay">🌱</div>
    <h1 class="title" id="authTitle">認証</h1>
    
    <!-- Toggle buttons for Login/Register -->
    <div class="auth-toggle">
      <button class="toggle-btn active" id="loginToggle" onclick="switchToLogin()">ログイン</button>
      <button class="toggle-btn" id="registerToggle" onclick="switchToRegister()">登録</button>
    </div>

    <div id="error-message" class="error-message"></div>

    <!-- スピナー表示エリア（Web Componentを利用） -->
    <my-spinner id="spinner"></my-spinner>

    <!-- Email input section -->
    <div id="email-section">
      <label for="email" class="email-label">メールアドレス:</label>
      <input type="email" id="email" name="email" required class="email-input" placeholder="example@mail.com">
      <button id="sendCodeBtn" class="submit-btn">認証コード送信</button>
    </div>

    <!-- Code input section (initially hidden) -->
    <div id="code-section" class="hidden">
      <label for="authCode" class="email-label">認証コード:</label>
      <input type="text" id="authCode" name="authCode" required class="email-input" placeholder="認証コードを入力">
      <button id="verifyCodeBtn" class="submit-btn">認証する</button>
    </div>

    <!-- Google authentication -->
    <div class="google-container">
      <button type="button" class="google-btn" id="googleAuthBtn">
        <i class="bi bi-google"></i> <span id="googleBtnText">Googleでログイン</span>
      </button>
    </div>
  </div>

  <!-- モーダル -->
  <div id="messageModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <p id="modalMessage"></p>
    </div>
  </div>
`;
const styleMarkup = `
:root {
  --accent: #00ff88;
  --accent-soft: #ccff99;
  --bg-1: #0e401e;
  --bg-2: #164f2f;
  --glass: rgba(12, 28, 20, 0.72);
  --glass-border: rgba(255, 255, 255, 0.12);
  --text: #eafff3;
  --muted: rgba(255, 255, 255, 0.72);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Outfit', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, var(--bg-1), var(--bg-2));
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text);
  overflow: hidden;
  position: relative;
}

.auth-container {
  position: relative;
  z-index: 1;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  padding: 36px 32px 32px;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  width: min(92vw, 440px);
  margin: 0 auto;
  animation: cardIn 0.8s ease;
}

@media (max-width: 600px) {
  .auth-container {
    padding: 28px 22px 26px;
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.title {
  font-size: 2.1rem;
  color: var(--accent);
  margin: 10px 0 18px;
  letter-spacing: 0.06em;
  text-shadow: 0 8px 24px rgba(0, 255, 136, 0.25);
}

.auth-toggle {
  display: flex;
  margin-bottom: 22px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px;
  gap: 4px;
}

.toggle-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 0.98rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.25s ease;
}

.toggle-btn.active {
  background: var(--accent);
  color: #072b1a;
  box-shadow: 0 8px 20px rgba(0, 255, 136, 0.35);
}

.toggle-btn:hover:not(.active) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.email-label {
  display: block;
  font-size: 0.95rem;
  color: var(--muted);
  margin: 12px 0 8px;
  text-align: left;
}

.email-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(10, 20, 15, 0.55);
  color: #ffffff;
  outline: none;
  transition: border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
  margin-bottom: 16px;
}

.email-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.email-input:focus {
  background: rgba(10, 20, 15, 0.7);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.2);
}

.submit-btn {
  background: linear-gradient(135deg, #00ff88, #00d77a);
  color: #072b1a;
  border: none;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  width: 100%;
  margin: 6px auto 0;
  display: block;
  text-align: center;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(0, 255, 136, 0.35);
}

.submit-btn:disabled {
  background: #666;
  color: #e0e0e0;
  cursor: not-allowed;
  box-shadow: none;
}

.google-btn {
  background-color: #4285F4;
  color: #ffffff;
  border: none;
  padding: 12px 18px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
  width: 100%;
  margin: 18px auto 0;
}

.google-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.25);
}

.google-container {
  margin-top: 8px;
}

@media (max-width: 600px) {
  .submit-btn, .google-btn {
    font-size: 0.95rem;
  }
}

.bot-icon {
  font-size: 3.6rem;
  color: var(--accent);
  margin-bottom: 12px;
  animation: botBlink 3s ease-in-out infinite;
}

@keyframes botBlink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.chat-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url("/static/img.jpg") no-repeat center center / cover;
  opacity: 0.22;
  z-index: 0;
}

.chat-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(14, 64, 30, 0.75), rgba(22, 79, 47, 0.6));
}

#code-section .email-input {
  border-color: rgba(204, 255, 153, 0.6);
  color: #ccff99;
}

#code-section .email-input:focus {
  border-color: #ccff99;
  box-shadow: 0 0 0 3px rgba(204, 255, 153, 0.25);
}

#code-section .submit-btn {
  background: linear-gradient(135deg, #ccff99, #b3e68d);
  color: #14361f;
}

#code-section .submit-btn:hover {
  box-shadow: 0 12px 24px rgba(204, 255, 153, 0.35);
}

.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background-color: #0e401e;
  margin: 15% auto;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: min(88vw, 420px);
  border-radius: 16px;
  text-align: center;
  color: #fff;
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.3);
  animation: modalFadeIn 0.4s ease;
}

#modalMessage {
  white-space: pre-line;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

.modal.hide-animation .modal-content {
  animation: slideUp 0.5s forwards;
}

.close {
  position: absolute;
  top: 10px;
  right: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: #fff;
  text-decoration: none;
}

.hidden {
  display: none !important;
}

.error-message {
  color: #ff6b6b;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

button:focus-visible,
input:focus-visible {
  outline: 3px solid rgba(0, 255, 136, 0.35);
  outline-offset: 2px;
}
`;
const inlineScript = `
// Logged-in users should not stay on the auth page. Redirect them to the top page.
    fetch('/api/current_user')
      .then(response => response.json())
      .then(data => {
        if (data.logged_in) {
          window.location.href = '/';
        }
      })
      .catch(error => {
        console.error('Error checking login state:', error);
      });

    // Current mode: 'login' or 'register'
    let currentMode = 'login';

    // UI Elements
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const authTitle = document.getElementById('authTitle');
    const iconDisplay = document.getElementById('iconDisplay');
    const emailSection = document.getElementById('email-section');
    const codeSection = document.getElementById('code-section');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const googleBtnText = document.getElementById('googleBtnText');
    const errorMessage = document.getElementById('error-message');

    // Switch to login mode
    function switchToLogin() {
      currentMode = 'login';
      loginToggle.classList.add('active');
      registerToggle.classList.remove('active');
      authTitle.textContent = 'ログイン';
      iconDisplay.textContent = '🌱';
      sendCodeBtn.textContent = '認証コード送信';
      verifyCodeBtn.textContent = 'ログイン';
      googleBtnText.textContent = 'Googleでログイン';
      
      // Reset form
      resetForm();
    }

    // Switch to register mode
    function switchToRegister() {
      currentMode = 'register';
      registerToggle.classList.add('active');
      loginToggle.classList.remove('active');
      authTitle.textContent = '登録';
      iconDisplay.textContent = '🐟';
      sendCodeBtn.textContent = '確認メール送信';
      verifyCodeBtn.textContent = '認証する';
      googleBtnText.textContent = 'Googleで登録';
      
      // Reset form
      resetForm();
    }

    // Reset form to initial state
    function resetForm() {
      document.getElementById('email').value = '';
      document.getElementById('authCode').value = '';
      emailSection.classList.remove('hidden');
      codeSection.classList.add('hidden');
      errorMessage.textContent = '';
      sendCodeBtn.disabled = false;
    }

    // Modal functions
    function showModalMessage(msg) {
      document.getElementById('modalMessage').textContent = msg;
      const modal = document.getElementById('messageModal');
      modal.style.display = 'block';
      setTimeout(hideModal, 2000);
    }

    function hideModal() {
      const modal = document.getElementById('messageModal');
      modal.classList.add('hide-animation');
      modal.querySelector('.modal-content').addEventListener('animationend', function handler() {
        modal.style.display = 'none';
        modal.classList.remove('hide-animation');
        this.removeEventListener('animationend', handler);
      });
    }

    // Modal event listeners
    const modal = document.getElementById("messageModal");
    const closeBtn = modal.querySelector(".close");
    closeBtn.addEventListener("click", hideModal);
    window.addEventListener("click", function (event) {
      if (event.target == modal) hideModal();
    });

    // Send code button handler
    document.getElementById('sendCodeBtn').addEventListener('click', async function () {
      const email = document.getElementById('email').value.trim();
      errorMessage.textContent = "";

      if (!email) {
        errorMessage.textContent = "メールアドレスを入力してください。";
        return;
      }

      // Show spinner and disable button
      document.getElementById('spinner').show();
      sendCodeBtn.disabled = true;

      try {
        let endpoint, successIcon, successMessage;
        
        if (currentMode === 'login') {
          endpoint = '/api/send_login_code';
          successIcon = '🌳';
          successMessage = '認証コードが送信されました。';
        } else {
          endpoint = '/api/send_verification_email';
          successIcon = '🐳';
          successMessage = '確認メールを送信しました。\n\n認証コードを入力してください。';
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });

        const data = await response.json();
        
        if (data.status === "success") {
          // Switch to code input
          emailSection.classList.add('hidden');
          codeSection.classList.remove('hidden');
          iconDisplay.textContent = successIcon;
          showModalMessage(successMessage);
        } else {
          errorMessage.textContent = data.error || "認証コード送信に失敗しました。";
        }
      } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = "サーバーエラーが発生しました。";
      } finally {
        document.getElementById('spinner').hide();
        sendCodeBtn.disabled = false;
      }
    });

    // Verify code button handler
    document.getElementById('verifyCodeBtn').addEventListener('click', async function () {
      const authCode = document.getElementById('authCode').value.trim();
      errorMessage.textContent = "";
      
      if (!authCode) {
        errorMessage.textContent = "認証コードを入力してください。";
        return;
      }

      try {
        let endpoint;
        
        if (currentMode === 'login') {
          endpoint = '/api/verify_login_code';
        } else {
          endpoint = '/api/verify_registration_code';
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authCode: authCode })
        });

        const data = await response.json();
        
        if (data.status === "success") {
          if (currentMode === 'register') {
            showModalMessage("認証が完了しました！\n数秒後にトップページへ移動します。");
          }
          setTimeout(() => {
            window.location.href = "/";
          }, currentMode === 'register' ? 2000 : 0);
        } else {
          errorMessage.textContent = data.error || "認証に失敗しました。";
        }
      } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = "サーバーエラーが発生しました。";
      }
    });

    // Google authentication button handler
    document.getElementById('googleAuthBtn').addEventListener('click', function () {
      window.location.href = '/google-login';
    });

    // Initialize with login mode
    const initialMode = window.location.pathname === '/register' ? 'register' : 'login';
    if (initialMode === 'register') {
      switchToRegister();
    } else {
      switchToLogin();
    }
`;

export default function AuthPage() {
  useEffect(() => {
    import("../scripts/entries/auth");
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AIチャット 認証</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
        <link rel="icon" type="image/webp" href="/static/favicon.webp" />
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <style dangerouslySetInnerHTML={{ __html: styleMarkup }} />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: bodyMarkup }} />
      <Script id="auth-inline-script" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: inlineScript }} />
    </>
  );
}
