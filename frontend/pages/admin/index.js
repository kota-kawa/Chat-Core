import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";

const styles = `
:root {
  color-scheme: light;
  --primary: #2f6fed;
  --primary-dark: #214bba;
  --surface: #ffffff;
  --surface-alt: rgba(255, 255, 255, 0.72);
  --text-main: #1f2933;
  --text-muted: #52606d;
  --border: rgba(47, 111, 237, 0.16);
  --shadow: 0 18px 40px rgba(33, 62, 125, 0.12);
  --radius-lg: 18px;
}
* {
  box-sizing: border-box;
}
body {
  font-family: "Noto Sans JP", "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(120% 120% at 10% 0%, #f2f6ff 0%, #eef1f9 35%, #e3ebff 100%);
  color: var(--text-main);
}
header {
  background: linear-gradient(120deg, var(--primary), #6f9dff);
  color: #fff;
  padding: 1.4rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 12px 30px rgba(47, 111, 237, 0.2);
}
header h1 {
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: 0.04em;
}
.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
header a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  padding: 0.5rem 1.4rem;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 999px;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
header a:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}
header a.back-link {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.32);
}
main {
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 3.5rem;
  max-width: min(95vw, 1500px);
  margin: 0 auto;
  overflow-x: hidden;
}
.flash-area {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}
.flash {
  padding: 0.9rem 1.1rem;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}
.flash::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.flash.error {
  border-color: rgba(225, 29, 72, 0.35);
  color: #b91c1c;
}
.flash.error::before {
  background: #f43f5e;
}
.flash.success {
  border-color: rgba(16, 185, 129, 0.35);
  color: #0f766e;
}
.flash.success::before {
  background: #34d399;
}
.content {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 2rem;
}
.right-column {
  display: grid;
  gap: 2rem;
  align-content: start;
}
.panel {
  background-color: var(--surface-alt);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
  padding: 1.8rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: var(--shadow);
}
.panel h2 {
  margin: 0 0 1.2rem;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
}
.panel h3 {
  margin-top: 2.2rem;
  font-size: 1.05rem;
  color: var(--text-muted);
}
ul.table-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}
ul.table-list li {
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(47, 111, 237, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
ul.table-list li:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(41, 81, 173, 0.18);
}
ul.table-list a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}
.table-preview-meta {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 1rem;
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 1.2rem;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  background: #fff;
  table-layout: auto;
}
table th, table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.24);
  font-size: 0.95rem;
  vertical-align: top;
  word-break: break-word;
  white-space: normal;
}
table th.wide-column, table td.wide-column {
  min-width: clamp(240px, 28vw, 420px);
}
table th {
  background: rgba(47, 111, 237, 0.08);
  font-weight: 600;
  color: var(--text-muted);
}
table tbody tr:last-child td {
  border-bottom: none;
}
table tbody tr:nth-child(even) {
  background: rgba(226, 232, 240, 0.35);
}
details.cell-details {
  border-radius: 12px;
  background: rgba(248, 250, 255, 0.75);
  border: 1px solid rgba(47, 111, 237, 0.14);
  padding: 0.55rem 0.75rem;
}
details.cell-details > summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--primary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
}
details.cell-details > summary::after {
  content: "＋";
  font-weight: 700;
  margin-left: auto;
  color: var(--primary);
}
details.cell-details > summary::-webkit-details-marker {
  display: none;
}
details.cell-details[open] > summary {
  margin-bottom: 0.5rem;
}
details.cell-details[open] > summary::after {
  content: "−";
}
.cell-summary-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-details-body {
  white-space: pre-wrap;
  color: #1f2937;
}
.schema-table-container {
  margin-bottom: 2rem;
}
.schema-table {
  margin-top: 0.8rem;
}
label {
  display: block;
  font-size: 0.92rem;
  margin: 0.9rem 0 0.4rem;
  color: var(--text-muted);
  font-weight: 600;
}
input, textarea, select {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-family: inherit;
}
textarea {
  min-height: 120px;
}
button {
  margin-top: 1rem;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--primary), #4f86ff);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(47, 111, 237, 0.3);
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.help-text {
  margin-top: 0.65rem;
  color: #ef4444;
  font-size: 0.9rem;
}
.error-text {
  margin-top: 1rem;
  color: #dc2626;
  font-weight: 600;
}
@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  header {
    flex-direction: column;
    gap: 1rem;
    padding: 1.4rem 1.5rem;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .header-actions a {
    width: 100%;
    text-align: center;
  }
  main {
    padding: 2rem 1.25rem 3rem;
  }
}
`;

export async function getServerSideProps(context) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5004";
  const cookie = context.req.headers.cookie || "";
  const table = context.query.table;
  const query = table ? `?table=${encodeURIComponent(table)}` : "";

  try {
    const res = await fetch(`${backendUrl}/admin/api/dashboard${query}`, {
      headers: cookie ? { cookie } : undefined
    });

    if (res.status === 401) {
      return {
        redirect: {
          destination: `/admin/login?next=${encodeURIComponent(context.resolvedUrl)}`,
          permanent: false
        }
      };
    }

    const data = await res.json();
    return {
      props: {
        tables: data.tables || [],
        selectedTable: data.selected_table || "",
        columnNames: data.column_names || [],
        columnDetails: data.column_details || [],
        rows: data.rows || [],
        error: data.error || "",
        messages: data.messages || []
      }
    };
  } catch (error) {
    return {
      props: {
        tables: [],
        selectedTable: "",
        columnNames: [],
        columnDetails: [],
        rows: [],
        error: "サーバーとの通信に失敗しました。",
        messages: []
      }
    };
  }
}

export default function AdminDashboard({
  tables,
  selectedTable,
  columnNames,
  columnDetails,
  rows,
  error,
  messages
}) {
  const router = useRouter();
  const [localMessage, setLocalMessage] = useState(null);
  const deleteDisabled = columnDetails.length <= 1;
  const wideColumns = [
    "message",
    "content",
    "prompt_template",
    "input_examples",
    "output_examples"
  ];

  const submitForm = async (event, endpoint) => {
    event.preventDefault();
    setLocalMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === "fail") {
        throw new Error(data.error || "操作に失敗しました。");
      }
      const destination = data.redirect || router.asPath || "/admin";
      router.replace(destination);
    } catch (err) {
      setLocalMessage({
        type: "error",
        text: err instanceof Error ? err.message : "操作に失敗しました。"
      });
    }
  };

  const handleLogout = async (event) => {
    event.preventDefault();
    try {
      await fetch("/admin/api/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } finally {
      router.replace("/admin/login");
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>管理コンソール</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </Head>
      <header>
        <h1>管理コンソール</h1>
        <nav className="header-actions">
          <a className="back-link" href="/admin">
            管理トップへ戻る
          </a>
          <a href="/admin/logout" onClick={handleLogout}>
            ログアウト
          </a>
        </nav>
      </header>
      <main>
        <div className="flash-area">
          {messages.map(([category, message], index) => (
            <div className={`flash ${category}`} key={`${category}-${index}`}>
              {message}
            </div>
          ))}
          {localMessage ? (
            <div className={`flash ${localMessage.type}`}>{localMessage.text}</div>
          ) : null}
        </div>

        <div className="content">
          <section className="panel">
            <h2>テーブル一覧</h2>
            <ul className="table-list">
              {tables.length ? (
                tables.map((table) => (
                  <li key={table}>
                    <span>{table}</span>
                    <a href={`/admin?table=${encodeURIComponent(table)}`}>開く</a>
                  </li>
                ))
              ) : (
                <li>テーブルが見つかりません。</li>
              )}
            </ul>

            <form onSubmit={(event) => submitForm(event, "/admin/api/delete-table")}>
              <h3>テーブルの削除</h3>
              <label htmlFor="delete-table-name">テーブル名</label>
              <input type="text" id="delete-table-name" name="table_name" required />
              <button type="submit">削除</button>
            </form>
          </section>

          <div className="right-column">
            <section className="panel">
              <h2>テーブルプレビュー</h2>
              {selectedTable ? (
                <>
                  <p className="table-preview-meta">
                    最大100件の行を表示しています：<strong>{selectedTable}</strong>
                  </p>
                  {columnDetails.length ? (
                    <div className="schema-table-container">
                      <h3>テーブル定義</h3>
                      <table className="schema-table">
                        <thead>
                          <tr>
                            <th>カラム名</th>
                            <th>型</th>
                            <th>NULL</th>
                            <th>キー</th>
                            <th>デフォルト</th>
                            <th>追加情報</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columnDetails.map((column) => (
                            <tr key={column.name}>
                              <td>{column.name}</td>
                              <td>{column.type}</td>
                              <td>{column.nullable ? "許可" : "不可"}</td>
                              <td>{column.key || "—"}</td>
                              <td>{column.default !== null && column.default !== undefined ? column.default : "—"}</td>
                              <td>{column.extra || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {columnNames.length ? (
                    <table>
                      <thead>
                        <tr>
                          {columnNames.map((column) => {
                            const headerClass = wideColumns.includes(column) ? "wide-column" : "";
                            return (
                              <th className={headerClass} key={column}>
                                {column}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length ? (
                          rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((value, colIndex) => {
                                const columnName = columnNames[colIndex];
                                const cellClass = wideColumns.includes(columnName) ? "wide-column" : "";
                                const cellText = value === null || value === undefined ? "" : String(value);
                                if (cellText.length > 160) {
                                  const summaryText = cellText
                                    .slice(0, 160)
                                    .replace(/\n/g, " ")
                                    .replace(/\r/g, " ");
                                  return (
                                    <td className={cellClass} key={`${rowIndex}-${colIndex}`}>
                                      <details className="cell-details">
                                        <summary>
                                          <span className="cell-summary-text">{summaryText}…</span>
                                        </summary>
                                        <div className="cell-details-body">{cellText}</div>
                                      </details>
                                    </td>
                                  );
                                }
                                return (
                                  <td className={cellClass} key={`${rowIndex}-${colIndex}`}>
                                    <div className="cell-details-body">{cellText}</div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columnNames.length}>表示できるデータがありません。</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p>表示できるデータがありません。</p>
                  )}
                </>
              ) : (
                <p className="table-preview-meta">内容を確認するテーブルを選択してください。</p>
              )}
            </section>

            <section className="panel">
              <h2>テーブル操作</h2>
              {selectedTable ? (
                <>
                  <h3>カラムの追加</h3>
                  <form onSubmit={(event) => submitForm(event, "/admin/api/add-column")}>
                    <input type="hidden" name="table_name" value={selectedTable} />
                    <label htmlFor="add-column-name">カラム名</label>
                    <input type="text" id="add-column-name" name="column_name" required />
                    <label htmlFor="add-column-type">カラム定義（例：VARCHAR(255) NOT NULL）</label>
                    <input type="text" id="add-column-type" name="column_type" required />
                    <button type="submit">カラムを追加</button>
                  </form>

                  <h3>カラムの削除</h3>
                  <form onSubmit={(event) => submitForm(event, "/admin/api/delete-column")}>
                    <input type="hidden" name="table_name" value={selectedTable} />
                    <label htmlFor="delete-column-name">削除するカラム</label>
                    <select
                      id="delete-column-name"
                      name="column_name"
                      disabled={deleteDisabled}
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        カラムを選択
                      </option>
                      {columnDetails.map((column) => (
                        <option value={column.name} key={column.name}>
                          {column.name}
                          {column.type ? ` (${column.type})` : ""}
                        </option>
                      ))}
                    </select>
                    <button type="submit" disabled={deleteDisabled}>
                      カラムを削除
                    </button>
                    {deleteDisabled ? (
                      <p className="help-text">テーブルのカラムが1つしかないため削除できません。</p>
                    ) : null}
                  </form>
                </>
              ) : (
                <>
                  <p className="table-preview-meta">カラムの変更を行うテーブルを選択してください。</p>

                  <h3>テーブルの作成</h3>
                  <form onSubmit={(event) => submitForm(event, "/admin/api/create-table")}>
                    <label htmlFor="create-table-name">テーブル名</label>
                    <input type="text" id="create-table-name" name="table_name" required />
                    <label htmlFor="column-definitions">カラム定義（SQL）</label>
                    <textarea
                      id="column-definitions"
                      name="columns"
                      placeholder="id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL"
                      required
                    ></textarea>
                    <label htmlFor="table-options">テーブルオプション（例：ENGINE=InnoDB DEFAULT CHARSET=utf8mb4）</label>
                    <input
                      type="text"
                      id="table-options"
                      name="table_options"
                      placeholder="ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                    />
                    <button type="submit">作成</button>
                  </form>
                </>
              )}

              {error ? <p className="error-text">エラー：{error}</p> : null}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
