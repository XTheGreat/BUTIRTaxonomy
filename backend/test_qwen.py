import httpx
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv('GROQ_API_KEY')
prompt = """Anda adalah Agen Penyusun dalam sistem BUTIR.
Buat SATU butir soal pilihan ganda (4 opsi A-D) HANYA berdasarkan potongan materi berikut:
Kecerdasan Buatan (AI) adalah simulasi kecerdasan manusia dalam mesin yang diatur untuk berpikir seperti manusia dan meniru tindakannya.
Target level kognitif Bloom: C2.
Keluarkan HANYA JSON valid sesuai skema:
{"pertanyaan": "string", "pilihan": {"A": "string", "B": "string", "C": "string", "D": "string"}, "kunci_jawaban": "A|B|C|D", "pembahasan": "string", "level_bloom_usulan": "C2"}"""

with httpx.Client(timeout=30) as client:
    r = client.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={'Authorization': f'Bearer {key}'},
        json={
            'model': 'qwen/qwen3.8-27b',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 600,
            'temperature': 0.7
        }
    )
    print('status:', r.status_code)
    print('content:', r.json()['choices'][0]['message']['content'])
