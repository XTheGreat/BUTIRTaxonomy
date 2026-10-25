from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "h3c8f6e2d5b7"
down_revision: Union[str, None] = "g2b7e5d1c4a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("kisi_kisi", sa.Column("nama", sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("kisi_kisi") as batch:
        batch.drop_column("nama")
