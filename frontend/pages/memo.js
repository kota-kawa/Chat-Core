import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { useState } from "react";

export async function getServerSideProps(context) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5004";
  const cookie = context.req.headers.cookie || "";
  let memos = [];

  try {
    const res = await fetch(`${backendUrl}/memo/api/recent`, {
      headers: cookie ? { cookie } : undefined
    });
    if (res.ok) {
      const data = await res.json();
      memos = Array.isArray(data.memos) ? data.memos : [];
    }
  } catch (err) {
    memos = [];
  }

  const saved = context.query.saved === "1";

  return {
    props: {
      memos,
      saved
    }
  };
}

export default function MemoPage({ memos, saved }) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    input_content: "",
    ai_response: "",
    title: "",
    tags: ""
  });
  const [message, setMessage] = useState(
    saved ? { type: "success", text: "メモを保存しました。" } : null
  );
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!formState.ai_response.trim()) {
      setMessage({ type: "error", text: "AIの回答を入力してください。" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/memo/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          input_content: formState.input_content,
          ai_response: formState.ai_response,
          title: formState.title,
          tags: formState.tags
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === "fail") {
        throw new Error(data.error || "メモの保存に失敗しました。");
      }

      router.replace("/memo?saved=1");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "メモの保存に失敗しました。"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>メモを保存</title>
        <link rel="icon" type="image/webp" href="/static/favicon.webp" />
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <link rel="stylesheet" href="/static/css/base/buttons.css" />
        <link rel="stylesheet" href="/memo/static/css/memo_form.css" />
      </Head>

      <div className="memo-page">
        <action-menu></action-menu>

        <div
          id="auth-buttons"
          style={{
            display: "none",
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 10000
          }}
        >
          <button id="login-btn" className="auth-btn">
            <i className="bi bi-person-circle"></i>
            <span>ログイン</span>
          </button>
        </div>

        <user-icon id="userIcon" style={{ display: "none" }}></user-icon>

        <div className="memo-container">
          <header className="memo-hero">
            <div className="memo-hero__text">
              <p className="memo-hero__eyebrow">Memo Workspace</p>
              <h1>会話メモを整理する</h1>
              <p>
                AIとのやり取りを保存し、後から素早く振り返りましょう。入力とAIの回答をそのまま記録できます。
              </p>
            </div>
          </header>

          <div className="memo-grid">
            <section className="memo-card memo-form-card">
              <div className="memo-card__header">
                <h2>新しいメモを追加</h2>
                <p>入力内容とAIの回答を貼り付けて保存します。</p>
              </div>

              {message ? (
                <div className="memo-flash-group" role="alert">
                  <div className={`memo-flash memo-flash--${message.type}`}>{message.text}</div>
                </div>
              ) : null}

              <form method="post" className="memo-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="input_content">
                    入力内容 <span className="optional">(任意)</span>
                  </label>
                  <textarea
                    id="input_content"
                    name="input_content"
                    placeholder="AIに送ったプロンプトを入力 / 貼り付けしてください"
                    value={formState.input_content}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ai_response">AIの回答</label>
                  <textarea
                    id="ai_response"
                    name="ai_response"
                    placeholder="AIからの回答を入力 / 貼り付けしてください"
                    required
                    value={formState.ai_response}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="title">
                      タイトル <span className="optional">(任意)</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      placeholder="空の場合は回答の1行目が使われます"
                      value={formState.title}
                      onChange={handleChange}
                      maxLength={255}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tags">
                      タグ <span className="optional">(任意・スペース区切り)</span>
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      placeholder="例: 仕事 議事録"
                      value={formState.tags}
                      onChange={handleChange}
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-button" disabled={submitting}>
                    <i className="bi bi-save"></i>
                    保存する
                  </button>
                </div>
              </form>
            </section>

            <section className="memo-card memo-history">
              <div className="memo-card__header memo-card__header--compact">
                <h2>最近保存したメモ</h2>
                <p>メモをクリックすると内容が表示されます。</p>
              </div>

              {memos.length ? (
                <ul className="memo-history__list">
                  {memos.map((memo) => {
                    const displayTitle = memo.title || "無題のメモ";
                    const tagList = memo.tags ? memo.tags.split(/\s+/).filter(Boolean) : [];
                    const excerpt = memo.ai_response
                      ? memo.ai_response.slice(0, 120) + (memo.ai_response.length > 120 ? "…" : "")
                      : "";

                    return (
                      <li key={memo.id}>
                        <button
                          type="button"
                          className="memo-item"
                          data-memo-id={memo.id}
                          data-title={displayTitle}
                          data-date={memo.created_at || ""}
                          data-tags={memo.tags || ""}
                          data-input={JSON.stringify(memo.input_content || "")}
                          data-response={JSON.stringify(memo.ai_response || "")}
                        >
                          <div className="memo-item__header">
                            <h3 className="memo-item__title">{displayTitle}</h3>
                            {memo.created_at ? (
                              <time className="memo-item__date">{memo.created_at}</time>
                            ) : null}
                          </div>
                          <div className="memo-tag-list">
                            {tagList.length ? (
                              tagList.map((tag) => (
                                <span className="memo-tag" key={tag}>
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="memo-tag memo-tag--muted">タグなし</span>
                            )}
                          </div>
                          {excerpt ? <p className="memo-item__excerpt">{excerpt}</p> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="memo-history__empty">まだ保存されたメモはありません。</p>
              )}
            </section>
          </div>
        </div>

        <div className="memo-modal" id="memoModal" aria-hidden="true">
          <div className="memo-modal__overlay" data-close-modal></div>
          <div
            className="memo-modal__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memoModalTitle"
          >
            <button type="button" className="memo-modal__close" data-close-modal aria-label="閉じる">
              <i className="bi bi-x-lg"></i>
            </button>
            <header className="memo-modal__header">
              <h3 id="memoModalTitle" data-modal-title>
                保存したメモ
              </h3>
              <p className="memo-modal__date" data-modal-date></p>
            </header>
            <div className="memo-modal__tags" data-modal-tags></div>
            <div className="memo-modal__body">
              <section className="memo-modal__section">
                <h4>入力内容</h4>
                <pre data-modal-input></pre>
              </section>
              <section className="memo-modal__section">
                <h4>AIの回答</h4>
                <pre data-modal-response></pre>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Script src="/static/js/components/popup_menu.js" strategy="afterInteractive" />
      <Script src="/static/js/components/user_icon.js" strategy="afterInteractive" />
      <Script src="/memo/static/js/memo_modal.js" strategy="afterInteractive" />
    </>
  );
}
