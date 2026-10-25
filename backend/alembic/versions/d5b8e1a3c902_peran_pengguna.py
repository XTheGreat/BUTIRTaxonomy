from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d5b8e1a3c902"
down_revision: Union[str, None] = "c4f2a91d7e30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("peran", sa.String(length=20), nullable=False, server_default="guru"))
    op.add_column("users", sa.Column("paket", sa.String(length=20), nullable=False, server_default="gratis"))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("paket")
        batch.drop_column("peran")
