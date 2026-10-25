from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "i4d9a7f3e6c8"
down_revision: Union[str, None] = "h3c8f6e2d5b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("butir_soal", sa.Column("arsip_meta", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("butir_soal") as batch:
        batch.drop_column("arsip_meta")
