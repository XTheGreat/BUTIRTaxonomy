from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c4f2a91d7e30"
down_revision: Union[str, None] = "80a03f49a80c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KOLOM_JSON = [
    ("kisi_kisi", "distribusi_bloom"),
    ("butir_soal", "pilihan"),
    ("debat_log", "output_json"),
]


def upgrade() -> None:
    op.add_column("butir_soal", sa.Column("percobaan_ke", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("butir_soal", sa.Column("alasan_tertunda", sa.Text(), nullable=True))
    op.add_column("debat_log", sa.Column("percobaan_ke", sa.Integer(), nullable=False, server_default="1"))
    op.add_column(
        "paket_ujian",
        sa.Column("rilis_hasil", sa.String(length=10), nullable=False, server_default="otomatis"),
    )
    op.add_column("paket_ujian", sa.Column("hasil_dirilis_pada", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "riwayat_percobaan",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("butir_id", sa.Uuid(), nullable=False),
        sa.Column("percobaan_ke", sa.Integer(), nullable=False),
        sa.Column("hasil", sa.String(length=20), nullable=False),
        sa.Column("ronde_terakhir", sa.Integer(), nullable=False),
        sa.Column("alasan", sa.Text(), nullable=True),
        sa.Column("mulai", sa.DateTime(timezone=True), nullable=False),
        sa.Column("selesai", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["butir_id"], ["butir_soal.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_riwayat_percobaan_butir_id", "riwayat_percobaan", ["butir_id"])

    op.create_table(
        "token_dicabut",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("kedaluwarsa", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dicabut_pada", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("token_hash"),
    )
    op.create_index("ix_token_dicabut_kedaluwarsa", "token_dicabut", ["kedaluwarsa"])

    op.create_table(
        "log_llm",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("waktu", sa.DateTime(timezone=True), nullable=False),
        sa.Column("guru_id", sa.Uuid(), nullable=True),
        sa.Column("butir_id", sa.Uuid(), nullable=True),
        sa.Column("percobaan_butir", sa.Integer(), nullable=True),
        sa.Column("ronde", sa.Integer(), nullable=True),
        sa.Column("peran", sa.String(length=20), nullable=False),
        sa.Column("kelompok", sa.String(length=10), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("fallback", sa.Boolean(), nullable=False),
        sa.Column("percobaan_panggilan", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("kode_http", sa.Integer(), nullable=True),
        sa.Column("latensi_ms", sa.Integer(), nullable=False),
        sa.Column("token_prompt", sa.Integer(), nullable=True),
        sa.Column("token_jawaban", sa.Integer(), nullable=True),
        sa.Column("token_total", sa.Integer(), nullable=True),
        sa.Column("galat", sa.String(length=300), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_log_llm_waktu", "log_llm", ["waktu"])
    op.create_index("ix_log_llm_guru_id", "log_llm", ["guru_id"])
    op.create_index("ix_log_llm_butir_id", "log_llm", ["butir_id"])

    op.create_table(
        "peserta_ujian",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("paket_ujian_id", sa.Uuid(), nullable=False),
        sa.Column("nama_siswa", sa.String(length=255), nullable=False),
        sa.Column("nama_kunci", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=True),
        sa.Column("masuk_pada", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paket_ujian_id"], ["paket_ujian.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paket_ujian_id", "nama_kunci", name="uq_peserta_paket_nama"),
    )
    op.create_index("ix_peserta_ujian_paket_ujian_id", "peserta_ujian", ["paket_ujian_id"])

    if op.get_bind().dialect.name == "postgresql":
        for tabel, kolom in KOLOM_JSON:
            op.alter_column(
                tabel, kolom, type_=postgresql.JSONB(), existing_type=sa.JSON(),
                existing_nullable=False, postgresql_using=f"{kolom}::jsonb",
            )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for tabel, kolom in KOLOM_JSON:
            op.alter_column(
                tabel, kolom, type_=sa.JSON(), existing_type=postgresql.JSONB(),
                existing_nullable=False, postgresql_using=f"{kolom}::json",
            )

    op.drop_index("ix_peserta_ujian_paket_ujian_id", table_name="peserta_ujian")
    op.drop_table("peserta_ujian")
    op.drop_index("ix_log_llm_butir_id", table_name="log_llm")
    op.drop_index("ix_log_llm_guru_id", table_name="log_llm")
    op.drop_index("ix_log_llm_waktu", table_name="log_llm")
    op.drop_table("log_llm")
    op.drop_index("ix_token_dicabut_kedaluwarsa", table_name="token_dicabut")
    op.drop_table("token_dicabut")
    op.drop_index("ix_riwayat_percobaan_butir_id", table_name="riwayat_percobaan")
    op.drop_table("riwayat_percobaan")

    with op.batch_alter_table("paket_ujian") as batch:
        batch.drop_column("hasil_dirilis_pada")
        batch.drop_column("rilis_hasil")
    with op.batch_alter_table("debat_log") as batch:
        batch.drop_column("percobaan_ke")
    with op.batch_alter_table("butir_soal") as batch:
        batch.drop_column("alasan_tertunda")
        batch.drop_column("percobaan_ke")
