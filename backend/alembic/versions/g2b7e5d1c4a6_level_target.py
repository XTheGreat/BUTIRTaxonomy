from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g2b7e5d1c4a6"
down_revision: Union[str, None] = "f1a9d4c2b3e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("butir_soal", sa.Column("level_target", sa.String(length=2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("butir_soal") as batch:
        batch.drop_column("level_target")
