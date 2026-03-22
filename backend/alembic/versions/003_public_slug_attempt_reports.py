"""public slug and attempt report fields

Revision ID: 003
Revises: 002
Create Date: 2026-03-21
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("tests", sa.Column("public_slug", sa.String(length=32), nullable=True))
    op.add_column("tests", sa.Column("show_results_immediately", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_tests_public_slug", "tests", ["public_slug"], unique=True)

    op.add_column("attempts", sa.Column("results", sa.JSON(), nullable=True))
    op.add_column("attempts", sa.Column("report_generated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("attempts", sa.Column("report_sent_at", sa.DateTime(timezone=True), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM tests")).fetchall()
    for row in rows:
        sid = str(row[0]).replace("-", "")[:10]
        slug = f"t{sid}"
        conn.execute(sa.text("UPDATE tests SET public_slug=:slug WHERE id=:id"), {"slug": slug, "id": row[0]})
    op.alter_column("tests", "public_slug", nullable=False)
    op.alter_column("tests", "show_results_immediately", server_default=None)


def downgrade() -> None:
    op.drop_column("attempts", "report_sent_at")
    op.drop_column("attempts", "report_generated_at")
    op.drop_column("attempts", "results")
    op.drop_index("ix_tests_public_slug", table_name="tests")
    op.drop_column("tests", "show_results_immediately")
    op.drop_column("tests", "public_slug")
