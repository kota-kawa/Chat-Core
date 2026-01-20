import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";

const styles = `
:root {
  color-scheme: light;
  --primary: #2f6fed;
  --primary-dark: #214bba;
  --surface: rgba(255, 255, 255, 0.82);
  --border: rgba(255, 255, 255, 0.65);
  --text-main: #1f2933;
}
* {
  box-sizing: border-box;
}
body {
  font-family: "Noto Sans JP", "Helvetica Neue", Arial, sans-serif;
  background: radial-gradient(110% 110% at 10% 0%, #f2f6ff 0%, #d9e4ff 40%, #eef1ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  padding: 1.5rem;
}
.login-container {
  background: var(--surface);
  padding: 2.2rem 2.4rem;
  border-radius: 22px;
  box-shadow: 0 20px 45px rgba(47, 111, 237, 0.18);
  width: min(360px, 100%);
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
}
h1 {
  font-size: 1.45rem;
  margin-bottom: 1.6rem;
  text-align: center;
  letter-spacing: 0.04em;
  color: var(--text-main);
}
label {
  display: block;
  margin-bottom: 0.55rem;
  font-weight: 600;
  font-size: 0.92rem;
  color: rgba(31, 41, 51, 0.75);
}
input[type="password"] {
  width: 100%;
  padding: 0.7rem 0.85rem;
  margin-bottom: 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.92);
  transition: border 0.2s ease, box-shadow 0.2s ease;
}
input[type="password"]:focus {
  outline: none;
  border-color: rgba(47, 111, 237, 0.6);
  box-shadow: 0 0 0 4px rgba(47, 111, 237, 0.18);
}
button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: linear-gradient(135deg, var(--primary), #4f86ff);
  color: #ffffff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.03em;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(47, 111, 237, 0.25);
}
.flash {
  margin-bottom: 1.2rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-weight: 500;
  text-align: center;
  backdrop-filter: blur(8px);
}
.flash.error {
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(254, 226, 226, 0.85);
  color: #b91c1c;
}
.flash.success {
  border: 1px solid rgba(16, 185, 129, 0.35);
  background: rgba(209, 250, 229, 0.85);
  color: #047857;
}
`;

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/admin/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          password,
          next: router.query.next || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === "fail") {
        throw new Error(data.error || "Invalid password.");
      }
      const destination = data.redirect || "/admin";
      router.replace(destination);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Invalid password."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>管理者ログイン</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </Head>
      <div className="login-container">
        <h1>管理者ログイン</h1>
        {message ? <div className={`flash ${message.type}`}>{message.text}</div> : null}
        <form onSubmit={handleSubmit}>
          <label htmlFor="password">パスワード</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            ログイン
          </button>
        </form>
      </div>
    </>
  );
}
