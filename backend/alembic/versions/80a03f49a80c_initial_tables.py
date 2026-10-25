from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '80a03f49a80c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nama', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('kisi_kisi',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('guru_id', sa.Uuid(), nullable=False),
    sa.Column('jumlah_butir', sa.Integer(), nullable=False),
    sa.Column('distribusi_bloom', sa.JSON(), nullable=False),
    sa.Column('cakupan_bab', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['guru_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('materi_ajar',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('guru_id', sa.Uuid(), nullable=False),
    sa.Column('judul', sa.String(length=500), nullable=False),
    sa.Column('file_path', sa.String(length=1000), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['guru_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('paket_ujian',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('guru_id', sa.Uuid(), nullable=False),
    sa.Column('judul', sa.String(length=500), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('kode_akses', sa.String(length=20), nullable=True),
    sa.Column('waktu_mulai', sa.DateTime(timezone=True), nullable=True),
    sa.Column('waktu_selesai', sa.DateTime(timezone=True), nullable=True),
    sa.Column('durasi_menit', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['guru_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('kode_akses')
    )
    op.create_table('kisi_kisi_materi',
    sa.Column('kisi_kisi_id', sa.Uuid(), nullable=False),
    sa.Column('materi_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['kisi_kisi_id'], ['kisi_kisi.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['materi_id'], ['materi_ajar.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('kisi_kisi_id', 'materi_id')
    )
    op.create_table('materi_chunks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('materi_id', sa.Uuid(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['materi_id'], ['materi_ajar.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('butir_soal',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('kisi_kisi_id', sa.Uuid(), nullable=False),
    sa.Column('pertanyaan', sa.Text(), nullable=False),
    sa.Column('pilihan', sa.JSON(), nullable=False),
    sa.Column('kunci_jawaban', sa.String(length=1), nullable=False),
    sa.Column('pembahasan', sa.Text(), nullable=False),
    sa.Column('level_bloom', sa.String(length=2), nullable=False),
    sa.Column('bobot_poin', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('ronde_saat_ini', sa.Integer(), nullable=False),
    sa.Column('prediksi_kesukaran', sa.Float(), nullable=True),
    sa.Column('rujukan_chunk_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['kisi_kisi_id'], ['kisi_kisi.id'], ),
    sa.ForeignKeyConstraint(['rujukan_chunk_id'], ['materi_chunks.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('debat_log',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('butir_id', sa.Uuid(), nullable=False),
    sa.Column('ronde', sa.Integer(), nullable=False),
    sa.Column('agen', sa.String(length=20), nullable=False),
    sa.Column('output_json', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['butir_id'], ['butir_soal.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('jawaban_siswa',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('paket_ujian_id', sa.Uuid(), nullable=False),
    sa.Column('nama_siswa', sa.String(length=255), nullable=False),
    sa.Column('butir_id', sa.Uuid(), nullable=False),
    sa.Column('jawaban_pilihan', sa.String(length=1), nullable=True),
    sa.Column('benar', sa.Boolean(), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['butir_id'], ['butir_soal.id'], ),
    sa.ForeignKeyConstraint(['paket_ujian_id'], ['paket_ujian.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('paket_ujian_butir',
    sa.Column('paket_ujian_id', sa.Uuid(), nullable=False),
    sa.Column('butir_id', sa.Uuid(), nullable=False),
    sa.Column('urutan', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['butir_id'], ['butir_soal.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['paket_ujian_id'], ['paket_ujian.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('paket_ujian_id', 'butir_id')
    )


def downgrade() -> None:
    op.drop_table('paket_ujian_butir')
    op.drop_table('jawaban_siswa')
    op.drop_table('debat_log')
    op.drop_table('butir_soal')
    op.drop_table('materi_chunks')
    op.drop_table('kisi_kisi_materi')
    op.drop_table('paket_ujian')
    op.drop_table('materi_ajar')
    op.drop_table('kisi_kisi')
    op.drop_table('users')
