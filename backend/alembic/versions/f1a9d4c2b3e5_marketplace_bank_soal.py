from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f1a9d4c2b3e5"
down_revision: Union[str, None] = "e8c3a7f1b204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JSON_TIPE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "listing_bank",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("penjual_id", sa.Uuid(), nullable=False),
        sa.Column("judul", sa.String(length=255), nullable=False),
        sa.Column("deskripsi", sa.Text(), nullable=False),
        sa.Column("harga_rp", sa.Integer(), nullable=False),
        sa.Column("aktif", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["penjual_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "listing_butir",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("urutan", sa.Integer(), nullable=False),
        sa.Column("pertanyaan", sa.Text(), nullable=False),
        sa.Column("pilihan", JSON_TIPE, nullable=False),
        sa.Column("kunci_jawaban", sa.String(length=1), nullable=False),
        sa.Column("pembahasan", sa.Text(), nullable=False),
        sa.Column("level_bloom", sa.String(length=2), nullable=False),
        sa.Column("bobot_poin", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listing_bank.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "transaksi_marketplace",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("pembeli_id", sa.Uuid(), nullable=False),
        sa.Column("harga_rp", sa.Integer(), nullable=False),
        sa.Column("komisi_rp", sa.Integer(), nullable=False),
        sa.Column("pendapatan_penjual_rp", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=25), nullable=False),
        sa.Column("kisi_kisi_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("selesai_pada", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["listing_id"], ["listing_bank.id"]),
        sa.ForeignKeyConstraint(["pembeli_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["kisi_kisi_id"], ["kisi_kisi.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("transaksi_marketplace")
    op.drop_table("listing_butir")
    op.drop_table("listing_bank")
