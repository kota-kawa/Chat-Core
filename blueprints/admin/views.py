from functools import wraps
from typing import Optional

from flask import (
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from mysql.connector import Error

from services.db import get_db_connection

from . import admin_bp

ADMIN_PASSWORD = "[REMOVED_SECRET]"


def _quote_identifier(name: str) -> str:
    return f"`{name.replace('`', '``')}`"


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            next_url = request.url
            return redirect(url_for("admin.login", next=next_url))
        return view_func(*args, **kwargs)

    return wrapper


@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = request.form.get("password", "")
        next_url = request.form.get("next") or url_for("admin.dashboard")
        if password == ADMIN_PASSWORD:
            session["is_admin"] = True
            flash("Logged in as administrator.", "success")
            return redirect(next_url)
        flash("Invalid password.", "error")
    next_url = request.args.get("next", url_for("admin.dashboard"))
    return render_template("admin_login.html", next_url=next_url)


@admin_bp.route("/logout")
@admin_required
def logout():
    session.pop("is_admin", None)
    flash("Logged out of administrator session.", "success")
    return redirect(url_for("admin.login"))


def _fetch_tables(cursor) -> list[str]:
    cursor.execute("SHOW TABLES")
    return [row[0] for row in cursor.fetchall()]


def _fetch_table_columns(cursor, table_name: str) -> list[dict[str, object]]:
    cursor.execute(f"SHOW COLUMNS FROM {_quote_identifier(table_name)}")
    columns: list[dict[str, object]] = []
    for row in cursor.fetchall():
        # SHOW COLUMNS returns: Field, Type, Null, Key, Default, Extra
        columns.append(
            {
                "name": row[0],
                "type": row[1],
                "nullable": row[2] == "YES",
                "key": row[3],
                "default": row[4],
                "extra": row[5],
            }
        )
    return columns


def _fetch_table_preview(cursor, table_name: str) -> tuple[list[str], list[tuple]]:
    cursor.execute(f"SELECT * FROM {_quote_identifier(table_name)} LIMIT 100")
    rows = cursor.fetchall()
    column_names = [desc[0] for desc in cursor.description]
    return column_names, rows


@admin_bp.route("/", methods=["GET"])
@admin_required
def dashboard():
    selected_table: Optional[str] = request.args.get("table")
    tables: list[str] = []
    column_names: list[str] = []
    column_details: list[dict[str, object]] = []
    existing_columns: list[str] = []
    rows: list[tuple] = []
    error: Optional[str] = None
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        tables = _fetch_tables(cursor)

        if selected_table:
            if selected_table in tables:
                column_names, rows = _fetch_table_preview(cursor, selected_table)
                column_details = _fetch_table_columns(cursor, selected_table)
                existing_columns = [column["name"] for column in column_details]
            else:
                flash("The selected table does not exist.", "error")
                selected_table = None
    except Error as exc:  # pragma: no cover - defensive logging
        error = str(exc)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return render_template(
        "admin_dashboard.html",
        tables=tables,
        selected_table=selected_table,
        column_names=column_names,
        column_details=column_details,
        existing_columns=existing_columns,
        rows=rows,
        error=error,
    )


@admin_bp.route("/create-table", methods=["POST"])
@admin_required
def create_table():
    table_name = request.form.get("table_name", "").strip()
    column_definitions = request.form.get("columns", "").strip()
    table_options = request.form.get("table_options", "").strip()

    if not table_name or not column_definitions:
        flash("Table name and column definition are required.", "error")
        return redirect(url_for("admin.dashboard"))

    if table_options:
        normalized_options = table_options.rstrip(";").strip()
        if ";" in normalized_options:
            flash("テーブルオプションに複数の文を含めることはできません。", "error")
            return redirect(url_for("admin.dashboard"))
        table_options = normalized_options

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        create_sql = f"CREATE TABLE {_quote_identifier(table_name)} ({column_definitions})"
        if table_options:
            create_sql = f"{create_sql} {table_options}"
        cursor.execute(create_sql)
        connection.commit()
        flash(f"Table '{table_name}' created successfully.", "success")
    except Error as exc:
        flash(f"Failed to create table: {exc}", "error")
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/delete-table", methods=["POST"])
@admin_required
def delete_table():
    table_name = request.form.get("table_name", "").strip()

    if not table_name:
        flash("Table name is required for deletion.", "error")
        return redirect(url_for("admin.dashboard"))

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        existing_tables = _fetch_tables(cursor)
        if table_name not in existing_tables:
            flash(f"Table '{table_name}' does not exist.", "error")
            return redirect(url_for("admin.dashboard"))
        cursor.execute(f"DROP TABLE {_quote_identifier(table_name)}")
        connection.commit()
        flash(f"Table '{table_name}' deleted successfully.", "success")
    except Error as exc:
        flash(f"Failed to delete table: {exc}", "error")
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/add-column", methods=["POST"])
@admin_required
def add_column():
    table_name = request.form.get("table_name", "").strip()
    column_name = request.form.get("column_name", "").strip()
    column_type = request.form.get("column_type", "").strip()

    if not table_name or not column_name or not column_type:
        flash("テーブル名、カラム名、カラム定義は必須です。", "error")
        return redirect(url_for("admin.dashboard", table=table_name))

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        tables = _fetch_tables(cursor)
        if table_name not in tables:
            flash(f"テーブル '{table_name}' は存在しません。", "error")
            return redirect(url_for("admin.dashboard"))

        existing_columns = [column["name"] for column in _fetch_table_columns(cursor, table_name)]
        normalized_existing_columns = {name.lower() for name in existing_columns}
        if column_name.lower() in normalized_existing_columns:
            flash(f"カラム '{column_name}' は既に存在します。", "error")
            return redirect(url_for("admin.dashboard", table=table_name))

        cursor.execute(
            f"ALTER TABLE {_quote_identifier(table_name)} ADD COLUMN {_quote_identifier(column_name)} {column_type}"
        )
        connection.commit()
        flash(f"カラム '{column_name}' をテーブル '{table_name}' に追加しました。", "success")
    except Error as exc:
        flash(f"カラムの追加に失敗しました: {exc}", "error")
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return redirect(url_for("admin.dashboard", table=table_name))


@admin_bp.route("/delete-column", methods=["POST"])
@admin_required
def delete_column():
    table_name = request.form.get("table_name", "").strip()
    column_name = request.form.get("column_name", "").strip()

    if not table_name or not column_name:
        flash("テーブル名とカラム名は必須です。", "error")
        return redirect(url_for("admin.dashboard", table=table_name))

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        tables = _fetch_tables(cursor)
        if table_name not in tables:
            flash(f"テーブル '{table_name}' は存在しません。", "error")
            return redirect(url_for("admin.dashboard"))

        columns = _fetch_table_columns(cursor, table_name)
        existing_columns = [column["name"] for column in columns]
        column_lookup = {name.lower(): name for name in existing_columns}
        target_column = column_lookup.get(column_name.lower())
        if target_column is None:
            flash(f"カラム '{column_name}' は存在しません。", "error")
            return redirect(url_for("admin.dashboard", table=table_name))

        if len(existing_columns) <= 1:
            flash("テーブルには少なくとも1つのカラムが必要です。", "error")
            return redirect(url_for("admin.dashboard", table=table_name))

        cursor.execute(
            f"ALTER TABLE {_quote_identifier(table_name)} DROP COLUMN {_quote_identifier(target_column)}"
        )
        connection.commit()
        flash(f"カラム '{target_column}' をテーブル '{table_name}' から削除しました。", "success")
    except Error as exc:
        flash(f"カラムの削除に失敗しました: {exc}", "error")
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return redirect(url_for("admin.dashboard", table=table_name))
