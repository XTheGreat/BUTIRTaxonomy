from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e8c3a7f1b204"
down_revision: Union[str, None] = "d5b8e1a3c902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "institusi",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nama", sa.String(length=255), nullable=False),
        sa.Column("kursi", sa.Integer(), nullable=False),
        sa.Column("aktif", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("institusi_id", sa.Uuid(), nullable=True))
        batch.add_column(sa.Column("admin_institusi", sa.Boolean(), nullable=False, server_default="0"))
        batch.create_foreign_key("fk_users_institusi_id", "institusi", ["institusi_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_constraint("fk_users_institusi_id", type_="foreignkey")
        batch.drop_column("admin_institusi")
        batch.drop_column("institusi_id")
    op.drop_table("institusi")
