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
        rows=rows,
        error=error,
    )


@admin_bp.route("/create-table", methods=["POST"])
@admin_required
def create_table():
    table_name = request.form.get("table_name", "").strip()
    column_definitions = request.form.get("columns", "").strip()

    if not table_name or not column_definitions:
        flash("Table name and column definition are required.", "error")
        return redirect(url_for("admin.dashboard"))

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(f"CREATE TABLE {_quote_identifier(table_name)} ({column_definitions})")
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
