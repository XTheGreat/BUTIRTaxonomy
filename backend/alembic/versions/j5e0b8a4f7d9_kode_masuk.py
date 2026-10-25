from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "j5e0b8a4f7d9"
down_revision: Union[str, None] = "i4d9a7f3e6c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "kode_masuk",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("kode_hash", sa.String(length=64), nullable=False),
        sa.Column("kedaluwarsa", sa.DateTime(timezone=True), nullable=False),
        sa.Column("percobaan", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dibuat_pada", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_kode_masuk_email", "kode_masuk", ["email"])


def downgrade() -> None:
    op.drop_index("ix_kode_masuk_email", table_name="kode_masuk")
    op.drop_table("kode_masuk")
