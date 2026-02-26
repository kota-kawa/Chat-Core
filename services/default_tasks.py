import json
from functools import lru_cache
from pathlib import Path

from .db import get_db_connection

DEFAULT_TASKS_JSON = (
    Path(__file__).resolve().parent.parent / "frontend" / "data" / "default_tasks.json"
)


@lru_cache(maxsize=1)
def load_default_tasks() -> list[dict]:
    with DEFAULT_TASKS_JSON.open(encoding="utf-8") as fp:
        tasks = json.load(fp)

    if not isinstance(tasks, list):
        raise ValueError("default_tasks.json must contain a list.")

    normalized: list[dict] = []
    for index, task in enumerate(tasks):
        if not isinstance(task, dict):
            raise ValueError("Each default task must be an object.")

        normalized.append(
            {
                "name": str(task["name"]),
                "prompt_template": str(task["prompt_template"]),
                "input_examples": str(task["input_examples"]),
                "output_examples": str(task["output_examples"]),
                "display_order": int(task.get("display_order", index)),
            }
        )
    return normalized


def default_task_payloads() -> list[dict]:
    payloads = []
    for task in load_default_tasks():
        payloads.append(
            {
                "name": task["name"],
                "prompt_template": task["prompt_template"],
                "input_examples": task["input_examples"],
                "output_examples": task["output_examples"],
                "is_default": True,
            }
        )
    return payloads


def default_task_rows() -> list[tuple]:
    rows = []
    for task in load_default_tasks():
        rows.append(
            (
                task["name"],
                task["prompt_template"],
                task["input_examples"],
                task["output_examples"],
                task["display_order"],
            )
        )
    return rows


def _extract_name(row):
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get("name")
    return row[0]


def ensure_default_tasks_seeded() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT name
              FROM task_with_examples
             WHERE user_id IS NULL
            """
        )
        existing_names = {
            name
            for name in (_extract_name(row) for row in cursor.fetchall())
            if isinstance(name, str)
        }

        inserted = 0
        for name, template, input_example, output_example, display_order in default_task_rows():
            if name in existing_names:
                continue

            cursor.execute(
                """
                INSERT INTO task_with_examples
                      (user_id, name, prompt_template, input_examples, output_examples, display_order)
                VALUES (NULL, %s, %s, %s, %s, %s)
                """,
                (name, template, input_example, output_example, display_order),
            )
            inserted += 1

        if inserted > 0:
            conn.commit()

        return inserted
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
