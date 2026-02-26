"""Add index improvements and prompt-list partial uniqueness.

Revision ID: 20260227_01
Revises:
Create Date: 2026-02-27 06:15:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260227_01"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return set(inspector.get_table_names())


def upgrade() -> None:
    tables = _existing_tables()

    if "chat_rooms" in tables:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_created_at
                ON chat_rooms (user_id, created_at DESC)
            """
        )

    if "chat_history" in tables:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chat_history_room_id_id
                ON chat_history (chat_room_id, id)
            """
        )

    if "task_with_examples" in tables:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_task_with_examples_user_name
                ON task_with_examples (user_id, name)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_task_with_examples_user_order
                ON task_with_examples (user_id, display_order, id)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_task_with_examples_user_created_at
                ON task_with_examples (user_id, created_at DESC, id DESC)
            """
        )

    if "prompts" in tables:
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_public_created_at
                ON prompts (is_public, created_at DESC)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_user_created_at
                ON prompts (user_id, created_at DESC)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_public_title_trgm
                ON prompts USING gin (title gin_trgm_ops)
                WHERE is_public = TRUE
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_public_content_trgm
                ON prompts USING gin (content gin_trgm_ops)
                WHERE is_public = TRUE
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_public_category_trgm
                ON prompts USING gin (category gin_trgm_ops)
                WHERE is_public = TRUE
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompts_public_author_trgm
                ON prompts USING gin (author gin_trgm_ops)
                WHERE is_public = TRUE
            """
        )

    if "prompt_list_entries" in tables:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompt_list_user_title
                ON prompt_list_entries (user_id, title)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_prompt_list_user_created_at
                ON prompt_list_entries (user_id, created_at DESC, id DESC)
            """
        )
        op.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM prompt_list_entries
                    WHERE prompt_id IS NULL
                    GROUP BY user_id, title
                    HAVING COUNT(*) > 1
                ) THEN
                    RAISE EXCEPTION
                        'Cannot create uq_prompt_list_user_title_when_prompt_null due to duplicate rows.';
                END IF;
            END $$;
            """
        )
        op.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_prompt_list_user_title_when_prompt_null
                ON prompt_list_entries (user_id, title)
                WHERE prompt_id IS NULL
            """
        )

    if "memo_entries" in tables:
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_memo_entries_created_at
                ON memo_entries (created_at DESC)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_memo_entries_user_created_at
                ON memo_entries (user_id, created_at DESC)
            """
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_prompt_list_user_title_when_prompt_null")
    op.execute("DROP INDEX IF EXISTS idx_prompts_public_author_trgm")
    op.execute("DROP INDEX IF EXISTS idx_prompts_public_category_trgm")
    op.execute("DROP INDEX IF EXISTS idx_prompts_public_content_trgm")
    op.execute("DROP INDEX IF EXISTS idx_prompts_public_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_memo_entries_user_created_at")
    op.execute("DROP INDEX IF EXISTS idx_memo_entries_created_at")
    op.execute("DROP INDEX IF EXISTS idx_prompt_list_user_created_at")
    op.execute("DROP INDEX IF EXISTS idx_prompt_list_user_title")
    op.execute("DROP INDEX IF EXISTS idx_prompts_user_created_at")
    op.execute("DROP INDEX IF EXISTS idx_prompts_public_created_at")
    op.execute("DROP INDEX IF EXISTS idx_task_with_examples_user_created_at")
    op.execute("DROP INDEX IF EXISTS idx_task_with_examples_user_order")
    op.execute("DROP INDEX IF EXISTS idx_task_with_examples_user_name")
    op.execute("DROP INDEX IF EXISTS idx_chat_history_room_id_id")
    op.execute("DROP INDEX IF EXISTS idx_chat_rooms_user_created_at")
