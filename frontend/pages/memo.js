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
  const messageTone =
    message?.type === "success"
      ? "border-emerald-400/70 bg-emerald-50 text-emerald-700"
      : "border-rose-400/70 bg-rose-50 text-rose-700";

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
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-emerald-50">
        <action-menu></action-menu>

        <div className="pointer-events-none absolute -top-24 right-[-10rem] h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl"></div>
        <div className="pointer-events-none absolute top-40 -left-24 h-96 w-96 rounded-full bg-lime-200/50 blur-3xl"></div>

        <div id="auth-buttons" className="fixed right-6 top-6 z-50 hidden">
          <button
            id="login-btn"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-emerald-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-emerald-300/70"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-emerald-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
            </svg>
            ログイン
          </button>
        </div>

        <user-icon id="userIcon" className="hidden"></user-icon>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:py-16">
          <header className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-emerald-100/60 backdrop-blur">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-200">
                ✍️
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
                  Memo Workspace
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                  会話メモを整理する
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
              AIとのやり取りを保存し、後から素早く振り返りましょう。入力とAIの回答をそのまま記録できます。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm">
                🗂️ タグで整理
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm">
                ⚡ すばやく検索
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm">
                🔒 安心の保存
              </span>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-emerald-100/40 backdrop-blur">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-slate-900">新しいメモを追加</h2>
                <p className="text-sm text-slate-500">
                  入力内容とAIの回答を貼り付けて保存します。
                </p>
              </div>

              {message ? (
                <div
                  className={`mt-6 rounded-2xl border border-transparent border-l-4 px-4 py-3 text-sm font-semibold ${messageTone}`}
                  role="alert"
                >
                  {message.text}
                </div>
              ) : null}

              <form method="post" className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="input_content">
                    入力内容 <span className="text-xs text-slate-400">(任意)</span>
                  </label>
                  <textarea
                    id="input_content"
                    name="input_content"
                    placeholder="AIに送ったプロンプトを入力 / 貼り付けしてください"
                    className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    value={formState.input_content}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="ai_response">
                    AIの回答
                  </label>
                  <textarea
                    id="ai_response"
                    name="ai_response"
                    placeholder="AIからの回答を入力 / 貼り付けしてください"
                    required
                    className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    value={formState.ai_response}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="title">
                      タイトル <span className="text-xs text-slate-400">(任意)</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      placeholder="空の場合は回答の1行目が使われます"
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                      value={formState.title}
                      onChange={handleChange}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="tags">
                      タグ <span className="text-xs text-slate-400">(任意・スペース区切り)</span>
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      placeholder="例: 仕事 議事録"
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                      value={formState.tags}
                      onChange={handleChange}
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-400">必須項目はAIの回答のみです。</p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5 hover:shadow-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting}
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm0 2l2 2h-2V5zm-2 13H7v-2h8v2zm0-4H7v-2h8v2zm0-4H7V8h8v2z" />
                    </svg>
                    保存する
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/70 p-8 shadow-2xl shadow-emerald-100/40 backdrop-blur">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-slate-900">最近保存したメモ</h2>
                <p className="text-sm text-slate-500">メモをクリックすると内容が表示されます。</p>
              </div>

              {memos.length ? (
                <ul className="mt-6 space-y-4">
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
                          className="memo-item group w-full rounded-2xl border border-slate-100 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                          data-memo-id={memo.id}
                          data-title={displayTitle}
                          data-date={memo.created_at || ""}
                          data-tags={memo.tags || ""}
                          data-input={JSON.stringify(memo.input_content || "")}
                          data-response={JSON.stringify(memo.ai_response || "")}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700">
                              {displayTitle}
                            </h3>
                            {memo.created_at ? (
                              <time className="text-xs font-medium text-slate-400">{memo.created_at}</time>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            {tagList.length ? (
                              tagList.map((tag) => (
                                <span
                                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"
                                  key={tag}
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-400">
                                タグなし
                              </span>
                            )}
                          </div>
                          {excerpt ? <p className="mt-3 text-sm text-slate-600">{excerpt}</p> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-sm text-slate-500">
                  まだ保存されたメモはありません。
                </div>
              )}
            </section>
          </div>
        </div>

        <div
          className="memo-modal fixed inset-0 z-50 hidden items-center justify-center px-4 py-10"
          id="memoModal"
          aria-hidden="true"
        >
          <div
            className="memo-modal__overlay absolute inset-0 bg-slate-900/60 opacity-0 backdrop-blur-sm transition-opacity duration-200"
            data-modal-overlay
            data-close-modal
          ></div>
          <div
            className="memo-modal__content relative z-10 w-full max-w-3xl translate-y-4 scale-95 rounded-3xl border border-white/60 bg-white/95 p-6 opacity-0 shadow-2xl shadow-slate-900/20 transition duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memoModalTitle"
            data-modal-content
          >
            <button
              type="button"
              className="memo-modal__close absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              data-close-modal
              aria-label="閉じる"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.6 16.9 4.29z" />
              </svg>
            </button>
            <header className="memo-modal__header">
              <h3 id="memoModalTitle" data-modal-title className="text-xl font-semibold text-slate-900">
                保存したメモ
              </h3>
              <p className="memo-modal__date mt-2 text-sm text-slate-500" data-modal-date></p>
            </header>
            <div className="memo-modal__tags mt-4 flex flex-wrap gap-2 text-xs font-semibold" data-modal-tags></div>
            <div className="memo-modal__body mt-6 grid gap-4 lg:grid-cols-2">
              <section className="memo-modal__section rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <h4 className="text-sm font-semibold text-slate-600">入力内容</h4>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700" data-modal-input></pre>
              </section>
              <section className="memo-modal__section rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <h4 className="text-sm font-semibold text-slate-600">AIの回答</h4>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700" data-modal-response></pre>
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
