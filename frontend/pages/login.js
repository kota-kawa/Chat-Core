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
body {
      margin: 0;
      padding: 0;
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #0e401e, #164f2f);
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    .auth-container {
      position: relative;
      z-index: 1;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      animation: float 5s ease-in-out infinite;
      width: 90%;
      max-width: 400px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    @media (max-width: 600px) {
      .auth-container {
        width: calc(100% - 32px);
        margin: 0 16px;
      }
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .title {
      font-size: 2rem;
      color: #00ff88;
      margin-bottom: 20px;
      text-shadow: 2px 2px 5px #008844;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0% {
        text-shadow: 2px 2px 5px #008844;
      }
      100% {
        text-shadow: 4px 4px 20px #00ff88;
      }
    }

    .auth-toggle {
      display: flex;
      margin-bottom: 25px;
      border-radius: 25px;
      background: rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .toggle-btn {
      flex: 1;
      padding: 12px 20px;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .toggle-btn.active {
      background: #00ff88;
      color: #000000;
      font-weight: bold;
    }

    .toggle-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.1);
    }

    .email-label {
      display: block;
      font-size: 1.2rem;
      color: #00ff88;
      margin-bottom: 10px;
    }

    .email-input {
      width: 100%;
      padding: 10px;
      font-size: 1rem;
      border: none;
      border-radius: 25px;
      background: rgba(0, 0, 0, 0.2);
      color: #ffffff;
      outline: none;
      transition: all 0.3s ease;
      margin-bottom: 20px;
      box-sizing: border-box;
    }

    .email-input:focus {
      background: rgba(0, 0, 0, 0.3);
      box-shadow: 0 0 10px #00ff88;
    }

    .submit-btn {
      background-color: #00ff88;
      color: #ffffff;
      border: none;
      padding: 10px 25px;
      font-size: 1.2rem;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 80%;
      margin: 20px auto 0;
      display: block;
      text-align: center;
    }

    .submit-btn:hover {
      background-color: #008844;
      box-shadow: 0 0 15px #00ff88;
    }

    .submit-btn:disabled {
      background-color: #666;
      cursor: not-allowed;
    }

    .google-btn {
      background-color: #4285F4;
      color: #ffffff;
      border: none;
      padding: 10px 25px;
      font-size: 1.2rem;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      width: 80%;
      margin: 20px auto 0;
    }

    .google-btn:hover {
      background-color: #357AE8;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
    }

    .google-container {
      margin-top: 20px;
    }

    /* スマホ表示時にボタンのフォントサイズを調整 */
    @media (max-width: 600px) {
      .submit-btn, .google-btn {
        font-size: 1rem;
      }
    }

    .bot-icon {
      font-size: 4rem;
      color: #00ff88;
      margin-bottom: 20px;
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
      background: url("/static/img.jpg") no-repeat center center/cover;
      opacity: 0.2;
      z-index: 0;
    }

    /* Code section styling for register mode */
    #codeSection .email-input {
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid #ccff99;
      color: #ccff99;
    }

    #codeSection .email-input:focus {
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 10px #ccff99;
    }

    #codeSection .submit-btn {
      background-color: #ccff99;
      color: #000000;
    }

    #codeSection .submit-btn:hover {
      background-color: #b3e68d;
      box-shadow: 0 0 15px #ccff99;
    }

    /* --- モーダルのスタイル --- */
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
      padding: 20px;
      border: 1px solid #888;
      width: 80%;
      max-width: 400px;
      border-radius: 10px;
      text-align: center;
      color: #fff;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.5s;
    }

    #modalMessage {
      white-space: pre-line;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* 下から上に消えるスライドアップアニメーション */
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
      right: 10px;
      color: #aaa;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }

    .close:hover,
    .close:focus {
      color: #fff;
      text-decoration: none;
    }

    /* Hidden sections */
    .hidden {
      display: none !important;
    }

    .error-message {
      color: #ff6b6b;
      margin-bottom: 10px;
      font-size: 0.9rem;
    }
`;

export default function AuthPage() {
  useEffect(() => {
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
      if(loginToggle) loginToggle.classList.add('active');
      if(registerToggle) registerToggle.classList.remove('active');
      if(authTitle) authTitle.textContent = 'ログイン';
      if(iconDisplay) iconDisplay.textContent = '🌱';
      if(sendCodeBtn) sendCodeBtn.textContent = '認証コード送信';
      if(verifyCodeBtn) verifyCodeBtn.textContent = 'ログイン';
      if(googleBtnText) googleBtnText.textContent = 'Googleでログイン';
      
      // Reset form
      resetForm();
    }

    // Switch to register mode
    function switchToRegister() {
      currentMode = 'register';
      if(registerToggle) registerToggle.classList.add('active');
      if(loginToggle) loginToggle.classList.remove('active');
      if(authTitle) authTitle.textContent = '登録';
      if(iconDisplay) iconDisplay.textContent = '🐟';
      if(sendCodeBtn) sendCodeBtn.textContent = '確認メール送信';
      if(verifyCodeBtn) verifyCodeBtn.textContent = '認証する';
      if(googleBtnText) googleBtnText.textContent = 'Googleで登録';
      
      // Reset form
      resetForm();
    }

    // Reset form to initial state
    function resetForm() {
      if(document.getElementById('email')) document.getElementById('email').value = '';
      if(document.getElementById('authCode')) document.getElementById('authCode').value = '';
      if(emailSection) emailSection.classList.remove('hidden');
      if(codeSection) codeSection.classList.add('hidden');
      if(errorMessage) errorMessage.textContent = '';
      if(sendCodeBtn) sendCodeBtn.disabled = false;
    }

    // Modal functions
    function showModalMessage(msg) {
      if(document.getElementById('modalMessage')) document.getElementById('modalMessage').textContent = msg;
      const modal = document.getElementById('messageModal');
      if(modal) {
        modal.style.display = 'block';
        setTimeout(hideModal, 2000);
      }
    }

    function hideModal() {
      const modal = document.getElementById('messageModal');
      if(!modal) return;
      modal.classList.add('hide-animation');
      const content = modal.querySelector('.modal-content');
      if(content) {
          const handler = function() {
            modal.style.display = 'none';
            modal.classList.remove('hide-animation');
            content.removeEventListener('animationend', handler);
          };
          content.addEventListener('animationend', handler);
      } else {
         modal.style.display = 'none';
         modal.classList.remove('hide-animation');
      }
    }

    // Expose functions to window
    window.switchToLogin = switchToLogin;
    window.switchToRegister = switchToRegister;

    // Modal event listeners
    const modal = document.getElementById("messageModal");
    if(modal) {
        const closeBtn = modal.querySelector(".close");
        if(closeBtn) closeBtn.addEventListener("click", hideModal);
        window.addEventListener("click", function (event) {
          if (event.target == modal) hideModal();
        });
    }

    // Send code button handler
    if(sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async function () {
          const email = document.getElementById('email').value.trim();
          if(errorMessage) errorMessage.textContent = "";
    
          if (!email) {
            if(errorMessage) errorMessage.textContent = "メールアドレスを入力してください。";
            return;
          }
    
          // Show spinner and disable button
          const spinner = document.getElementById('spinner');
          if(spinner && spinner.show) spinner.show();
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
              if(emailSection) emailSection.classList.add('hidden');
              if(codeSection) codeSection.classList.remove('hidden');
              if(iconDisplay) iconDisplay.textContent = successIcon;
              showModalMessage(successMessage);
            } else {
              if(errorMessage) errorMessage.textContent = data.error || "認証コード送信に失敗しました。";
            }
          } catch (error) {
            console.error('Error:', error);
            if(errorMessage) errorMessage.textContent = "サーバーエラーが発生しました。";
          } finally {
            if(spinner && spinner.hide) spinner.hide();
            sendCodeBtn.disabled = false;
          }
        });
    }

    // Verify code button handler
    if(verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async function () {
          const authCode = document.getElementById('authCode').value.trim();
          if(errorMessage) errorMessage.textContent = "";
          
          if (!authCode) {
            if(errorMessage) errorMessage.textContent = "認証コードを入力してください。";
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
              if(errorMessage) errorMessage.textContent = data.error || "認証に失敗しました。";
            }
          } catch (error) {
            console.error('Error:', error);
            if(errorMessage) errorMessage.textContent = "サーバーエラーが発生しました。";
          }
        });
    }

    // Google authentication button handler
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    if(googleAuthBtn) {
        googleAuthBtn.addEventListener('click', function () {
            window.location.href = '/google-login';
        });
    }

    // Initialize with login mode
    const initialMode = window.location.pathname === '/register' ? 'register' : 'login';
    if (initialMode === 'register') {
      switchToRegister();
    } else {
      switchToLogin();
    }

    // Cleanup
    return () => {
        delete window.switchToLogin;
        delete window.switchToRegister;
    };
  }, []); // Run once on mount

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AIチャット 認証</title>
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
      <Script type="module" src="/static/js/components/spinner.js" strategy="afterInteractive" />
    </>
  );
}