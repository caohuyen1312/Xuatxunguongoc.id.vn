"""XuatXu: retail observations, scoped references and a separate hash demonstration."""
import csv
import json
import os
import re
import unicodedata
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import qrcode
from flask import Flask, jsonify, render_template, request, send_file

ROOT = Path(__file__).resolve().parent
app = Flask(__name__)
app.config.update(MAX_CONTENT_LENGTH=8192, DEBUG=False)
app.json.ensure_ascii = False
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', 'https://xuatxu-web.onrender.com').rstrip('/')
if urlparse(PUBLIC_BASE_URL).scheme != 'https' or not urlparse(PUBLIC_BASE_URL).netloc:
    raise RuntimeError('PUBLIC_BASE_URL must be a public HTTPS URL')


def table(name, folder='data'):
    with (ROOT / folder / name).open(encoding='utf-8-sig', newline='') as handle:
        return [{k.strip(): (v or '').strip() for k, v in row.items() if k} for row in csv.DictReader(handle)]


def products():
    return table('SAN_PHAM.csv')


def product_for(value):
    return next((p for p in products() if value in (p['product_id'], p['slug'])), None)


def public_product(p):
    # Internal META identifiers are not lot codes and never go to the public API.
    return {k: v for k, v in p.items() if k not in {'primary_lot_id', 'qr_id', 'qr_target', 'gtin'} and v}


PHOTO_PATHS = {
    'SRC-VICHI-01': '/static/sources/VICHI_01_tao_roi_va_kiwi.png',
    'SRC-VICHI-02': '/static/sources/VICHI_02_hai_hop_kiwi.png',
    'SRC-VICHI-03': '/static/sources/VICHI_03_tao_ENVY_dong_tui.png',
}


def all_sources():
    usage = {s['source_id']: s for s in table('SOURCE_USAGE_STATUS.csv')}
    return [dict(s, image_url=PHOTO_PATHS.get(s['source_id'], ''),
                 source_status=usage.get(s['source_id'], {}).get('source_status', ''))
            for s in table('NGUON_THAM_KHAO.csv')]


def source_ids(text):
    return set(re.findall(r'SRC-[A-Z0-9-]+', text))


def qr_url(pid):
    return f'{PUBLIC_BASE_URL}/#detail/{pid}'


@app.get('/')
def index():
    return render_template('index.html')


@app.get('/api/init')
def api_init():
    gallery = json.loads((ROOT / 'data/gallery.json').read_text(encoding='utf-8'))
    return jsonify(success=True, products=[public_product(p) for p in products()], gallery=gallery,
                   feedback_url=os.environ.get('FEEDBACK_FORM_URL', '') if os.environ.get('FEEDBACK_FORM_URL', '').startswith('https://') else '',
                   dataset_version='FINAL v1.1 · 24/10/2026')


@app.get('/api/product-detail/<product_id>')
def product_detail(product_id):
    p = product_for(product_id)
    if not p:
        return jsonify(success=False, message='Không tìm thấy hồ sơ sản phẩm.'), 404
    pid = p['product_id']
    related = lambda name: [r for r in table(name) if r.get('product_id') == pid]
    cards = sorted(related('PUBLIC_DISPLAY_CARDS.csv'), key=lambda c: int(c['sort_order']))
    evidence = related('BANG_CHUNG.csv')
    claims = related('CLAIM_EVIDENCE.csv')
    qa = related('AI_HOI_DAP.csv')
    ids = source_ids(json.dumps([p, cards, evidence, claims, qa]))
    return jsonify(success=True, product=public_product(p), display_cards=cards,
                   evidences=evidence, claims=claims, sources=[s for s in all_sources() if s['source_id'] in ids],
                   questions=[{k: q[k] for k in ('qa_id', 'user_question')} for q in qa],
                   certifications=related('CHUNG_NHAN.csv'), journeys=[], ledger=[], lot={}, qr_target_url=qr_url(pid))


@app.get('/api/generate-qr')
def generate_qr():
    p = product_for(request.args.get('product_id', ''))
    if not p:
        return jsonify(success=False, message='Chọn một hồ sơ đã công bố để tạo QR.'), 400
    buffer = BytesIO()
    qr = qrcode.QRCode(box_size=8, border=4, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(qr_url(p['product_id']))
    qr.make(fit=True)
    qr.make_image(fill_color='#24483e', back_color='white').save(buffer, format='PNG')
    buffer.seek(0)
    return send_file(buffer, mimetype='image/png', download_name=f"XuatXu-{p['product_id']}.png",
                     as_attachment=request.args.get('download') == '1')


def normalize(text):
    return re.sub(r'[^a-z0-9 ]', '', ''.join(c for c in unicodedata.normalize('NFD', text.lower().replace('đ', 'd')) if not unicodedata.combining(c))).strip()


@app.post('/api/ai-ask')
def ai_ask():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get('product_id'), str):
        return jsonify(success=False, message='Vui lòng chọn hồ sơ sản phẩm.'), 400
    p = product_for(body['product_id'])
    if not p:
        return jsonify(success=False, message='Không tìm thấy hồ sơ sản phẩm.'), 404
    question = body.get('question', '')
    qa_id = body.get('qa_id', '')
    if not isinstance(question, str) or not isinstance(qa_id, str) or len(question) > 500 or len(qa_id) > 60:
        return jsonify(success=False, message='Câu hỏi tối đa 500 ký tự.'), 400
    options = [q for q in table('AI_HOI_DAP.csv') if q['product_id'] == p['product_id']]
    match = next((q for q in options if q['qa_id'] == qa_id), None) if qa_id else next((q for q in options if normalize(q['user_question']) == normalize(question)), None)
    if not match:
        return jsonify(success=True, match_status='OUT_OF_SCOPE', answer='Chưa đủ thông tin để kết luận. Hồ sơ hiện chưa có đủ thông tin để trả lời câu hỏi này. Bạn có thể chọn một câu hỏi gợi ý hoặc mở nguồn bằng chứng của sản phẩm.', source_ids=[], sources=[])
    ids = source_ids(match['recommended_answer'])
    return jsonify(success=True, match_status='CURATED_ANSWER', answer=match['recommended_answer'],
                   source_ids=sorted(ids), sources=[s for s in all_sources() if s['source_id'] in ids])


@app.get('/api/tech-demo')
def tech_demo():
    return jsonify(success=True, synthetic=True, onchain=False,
                   records=table('DEMO_HASH_CHAIN.csv', 'tech_demo'), events=table('DEMO_EVENTS.csv', 'tech_demo'))


@app.after_request
def response_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
    if request.path.startswith('/api/') or request.path == '/':
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.errorhandler(413)
def too_large(_error):
    return jsonify(success=False, message='Nội dung gửi quá dài.'), 413


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('PORT', 5000)), debug=False)
