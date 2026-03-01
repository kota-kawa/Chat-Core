import Head from "next/head";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

type AuthMode = "login" | "register";
type AuthStep = "email" | "code";

type ModeConfig = {
  title: string;
  defaultIcon: string;
  sentIcon: string;
  sendLabel: string;
  verifyLabel: string;
  googleLabel: string;
  sendEndpoint: string;
  verifyEndpoint: string;
  sentMessage: string;
};

const MODE_CONFIG: Record<AuthMode, ModeConfig> = {
  login: {
    title: "ログイン",
    defaultIcon: "🌱",
    sentIcon: "🌳",
    sendLabel: "認証コード送信",
    verifyLabel: "ログイン",
    googleLabel: "Googleでログイン",
    sendEndpoint: "/api/send_login_code",
    verifyEndpoint: "/api/verify_login_code",
    sentMessage: "認証コードが送信されました。"
  },
  register: {
    title: "登録",
    defaultIcon: "🐟",
    sentIcon: "🐳",
    sendLabel: "確認メール送信",
    verifyLabel: "認証する",
    googleLabel: "Googleで登録",
    sendEndpoint: "/api/send_verification_email",
    verifyEndpoint: "/api/verify_registration_code",
    sentMessage: "確認メールを送信しました。\n\n認証コードを入力してください。"
  }
};

const REDIRECT_DELAY_MS = 2000;
const MODAL_AUTO_CLOSE_MS = 2000;
const MODAL_CLOSE_ANIMATION_MS = 500;

type AuthGatewayPageProps = {
  initialMode: AuthMode;
};

export default function AuthGatewayPage({ initialMode }: AuthGatewayPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [icon, setIcon] = useState(MODE_CONFIG[initialMode].defaultIcon);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);

  const modalAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalCloseAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetFormForMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep("email");
    setEmail("");
    setAuthCode("");
    setErrorMessage("");
    setSendingCode(false);
    setVerifyingCode(false);
    setIcon(MODE_CONFIG[nextMode].defaultIcon);
  };

  const hideModal = () => {
    setIsModalClosing(true);
    clearTimer(modalAutoCloseTimerRef);
    clearTimer(modalCloseAnimationTimerRef);

    modalCloseAnimationTimerRef.current = setTimeout(() => {
      setModalMessage(null);
      setIsModalClosing(false);
    }, MODAL_CLOSE_ANIMATION_MS);
  };

  const showModalMessage = (message: string) => {
    setModalMessage(message);
    setIsModalClosing(false);

    clearTimer(modalAutoCloseTimerRef);
    clearTimer(modalCloseAnimationTimerRef);

    modalAutoCloseTimerRef.current = setTimeout(() => {
      hideModal();
    }, MODAL_AUTO_CLOSE_MS);
  };

  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkLoginState = async () => {
      try {
        const response = await fetch("/api/current_user", {
          credentials: "same-origin"
        });
        const data = await response.json();

        if (!cancelled && data.logged_in) {
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Error checking login state:", error);
      }
    };

    void checkLoginState();

    return () => {
      cancelled = true;
      clearTimer(modalAutoCloseTimerRef);
      clearTimer(modalCloseAnimationTimerRef);
      clearTimer(redirectTimerRef);
    };
  }, []);

  useEffect(() => {
    resetFormForMode(initialMode);
  }, [initialMode]);

  const config = MODE_CONFIG[mode];

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    setErrorMessage("");

    if (!trimmedEmail) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    setSendingCode(true);

    try {
      const response = await fetch(config.sendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail })
      });

      const data = await response.json().catch(() => ({}));

      if (data.status === "success") {
        setStep("code");
        setIcon(config.sentIcon);
        showModalMessage(config.sentMessage);
      } else {
        setErrorMessage(typeof data.error === "string" ? data.error : "認証コード送信に失敗しました。");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("サーバーエラーが発生しました。");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedCode = authCode.trim();
    setErrorMessage("");

    if (!trimmedCode) {
      setErrorMessage("認証コードを入力してください。");
      return;
    }

    setVerifyingCode(true);

    try {
      const response = await fetch(config.verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authCode: trimmedCode })
      });

      const data = await response.json().catch(() => ({}));

      if (data.status === "success") {
        if (mode === "register") {
          showModalMessage("認証が完了しました！\n数秒後にトップページへ移動します。");
          clearTimer(redirectTimerRef);
          redirectTimerRef.current = setTimeout(() => {
            window.location.href = "/";
          }, REDIRECT_DELAY_MS);
        } else {
          window.location.href = "/";
        }
      } else {
        setErrorMessage(typeof data.error === "string" ? data.error : "認証に失敗しました。");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("サーバーエラーが発生しました。");
    } finally {
      setVerifyingCode(false);
    }
  };

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
      </Head>

      <div className="auth-page-root">
        <div className="chat-background" />

        <div className="auth-container">
          {sendingCode ? (
            <div className="spinner-overlay" role="status" aria-live="polite" aria-label="送信中">
              <div className="spinner-ring" />
            </div>
          ) : null}

          <div className="bot-icon" id="iconDisplay">{icon}</div>
          <h1 className="title" id="authTitle">{config.title}</h1>

          <div className="auth-toggle">
            <button
              type="button"
              className={`toggle-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => resetFormForMode("login")}
            >
              ログイン
            </button>
            <button
              type="button"
              className={`toggle-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => resetFormForMode("register")}
            >
              登録
            </button>
          </div>

          <div id="error-message" className="error-message" role="alert">{errorMessage}</div>

          <div id="email-section" className={step === "email" ? "" : "hidden"}>
            <label htmlFor="email" className="email-label">メールアドレス:</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="email-input"
              placeholder="example@mail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <button
              id="sendCodeBtn"
              type="button"
              className="submit-btn"
              onClick={handleSendCode}
              disabled={sendingCode}
            >
              {config.sendLabel}
            </button>
          </div>

          <div id="code-section" className={step === "code" ? "" : "hidden"}>
            <label htmlFor="authCode" className="email-label">認証コード:</label>
            <input
              type="text"
              id="authCode"
              name="authCode"
              required
              className="email-input"
              placeholder="認証コードを入力"
              value={authCode}
              onChange={(event) => setAuthCode(event.target.value)}
              autoComplete="one-time-code"
            />
            <button
              id="verifyCodeBtn"
              type="button"
              className="submit-btn"
              onClick={handleVerifyCode}
              disabled={verifyingCode}
            >
              {config.verifyLabel}
            </button>
          </div>

          <div className="google-container">
            <button
              type="button"
              className="google-btn"
              id="googleAuthBtn"
              onClick={() => {
                window.location.href = "/google-login";
              }}
            >
              <i className="bi bi-google" /> <span id="googleBtnText">{config.googleLabel}</span>
            </button>
          </div>
        </div>

        <div
          id="messageModal"
          className={`modal ${modalMessage ? "is-open" : ""} ${isModalClosing ? "hide-animation" : ""}`}
          onClick={hideModal}
        >
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <button className="close" type="button" onClick={hideModal} aria-label="閉じる">
              &times;
            </button>
            <p id="modalMessage">{modalMessage}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
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

        body.auth-page,
        .auth-page-root {
          margin: 0;
          padding: 0;
          font-family: "Outfit", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Segoe UI", sans-serif;
          background: linear-gradient(135deg, var(--bg-1), var(--bg-2));
          min-height: 100vh;
          width: 100%;
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
          background-color: #4285f4;
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
          .submit-btn,
          .google-btn {
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
          0%,
          100% {
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

        .modal.is-open {
          display: block;
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
          margin: 0;
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
          border: none;
          background: transparent;
          line-height: 1;
          padding: 0;
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
          min-height: 1.2em;
        }

        button:focus-visible,
        input:focus-visible {
          outline: 3px solid rgba(0, 255, 136, 0.35);
          outline-offset: 2px;
        }

        .spinner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(14, 64, 30, 0.45);
          border-radius: 24px;
          z-index: 20;
          pointer-events: none;
        }

        .spinner-ring {
          width: 72px;
          height: 72px;
          border: 8px solid transparent;
          border-top-color: #ff00ff;
          border-right-color: #00ffff;
          border-bottom-color: #ffff00;
          border-left-color: #ff0000;
          border-radius: 50%;
          animation: spin 1s linear infinite, hueShift 3s linear infinite;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes hueShift {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
