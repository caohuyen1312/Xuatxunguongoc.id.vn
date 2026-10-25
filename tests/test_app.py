import hashlib
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app, table


class PublicProfiles(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_catalog_keeps_two_sourced_profiles_and_eight_covers_separate(self):
        data = self.client.get('/api/init').get_json()
        self.assertEqual({p['product_id'] for p in data['products']}, {'P-ENVY-VICHI-01','P-ZESPRI-VICHI-01'})
        self.assertEqual(len(data['gallery']), 8)
        for p in data['products'] + data['gallery']:
            with self.client.get(p['image_url']) as response:
                self.assertEqual(response.status_code, 200)
        self.assertNotIn('META-', json.dumps(data))
        for p in data['gallery']:
            self.assertEqual(self.client.get('/api/product-detail/' + p['id']).status_code, 404)

    def test_scoped_evidence_and_empty_actual_journeys(self):
        for pid in ['P-ENVY-VICHI-01','P-ZESPRI-VICHI-01']:
            data=self.client.get('/api/product-detail/'+pid).get_json()
            self.assertEqual(len(data['display_cards']),4)
            self.assertEqual(sum(c['section']=='LIMIT' for c in data['display_cards']),1)
            self.assertEqual(len(data['evidences']),7)
            self.assertTrue(all(e['verified_for_lot']=='False' for e in data['evidences']))
            self.assertEqual(data['journeys'],[])
            self.assertEqual(data['ledger'],[])
            self.assertEqual(data['lot'],{})
            text=json.dumps(data,ensure_ascii=False)
            for forbidden in ['META-','102384759201','PHYTO-2026-OK','BioViet','Chuỗi lạnh 2°C']:
                self.assertNotIn(forbidden,text)
            source_ids={s['source_id'] for s in data['sources']}
            for card in data['display_cards']:
                if card['source_ids']: self.assertIn(card['source_ids'],source_ids)

    def test_all_19_questions_are_product_scoped_and_cite_the_supplied_sources(self):
        rows=table('AI_HOI_DAP.csv')
        self.assertEqual(len(rows),19)
        for row in rows:
            for selector in [{'qa_id':row['qa_id']},{'question':row['user_question']}]:
                answer=self.client.post('/api/ai-ask',json={'product_id':row['product_id'],**selector}).get_json()
                self.assertEqual(answer['answer'],row['recommended_answer'])
                self.assertTrue(answer['source_ids'])
                self.assertEqual({s['source_id'] for s in answer['sources']},set(answer['source_ids']))
                for source in answer['sources']:
                    if source['image_url']:
                        with self.client.get(source['image_url']) as response:
                            self.assertEqual(response.status_code,200)

    def test_wrong_product_unknown_questions_and_input_validation(self):
        body={'product_id':'P-ENVY-VICHI-01','qa_id':'QA-Z-04'}
        self.assertEqual(self.client.post('/api/ai-ask',json=body).get_json()['match_status'],'OUT_OF_SCOPE')
        for question in ['Mã lô thực tế 123 là gì?', 'Cho tôi giấy kiểm dịch thật', 'Ai nhập khẩu lô này?', '<img src=x onerror=alert(1)>']:
            for pid in ['P-ENVY-VICHI-01','P-ZESPRI-VICHI-01']:
                answer=self.client.post('/api/ai-ask',json={'product_id':pid,'question':question}).get_json()
                self.assertEqual(answer['match_status'],'OUT_OF_SCOPE')
                self.assertIn('Chưa đủ thông tin',answer['answer'])
                self.assertNotIn('<img',answer['answer'])
        self.assertEqual(self.client.post('/api/ai-ask',json={'product_id':'P-ENVY-VICHI-01','question':'a'*501}).status_code,400)
        self.assertEqual(self.client.post('/api/ai-ask',json=[]).status_code,400)

    def test_actual_retail_variants_do_not_inherit_other_variants_claims(self):
        envy=self.client.get('/api/product-detail/P-ENVY-VICHI-01').get_json()
        kiwi=self.client.get('/api/product-detail/P-ZESPRI-VICHI-01').get_json()
        self.assertNotIn('assumed_country_of_origin',envy['product'])
        self.assertEqual(kiwi['product']['assumed_country_of_origin'],'New Zealand')
        self.assertIn('185.000',envy['display_cards'][0]['display_text'])
        self.assertIn('170.000',kiwi['display_cards'][0]['display_text'])
        self.assertIn('4 quả',kiwi['product']['display_name'])
        self.assertNotIn('Organic',kiwi['product']['display_name'])

    def test_qr_targets_are_https_and_only_accept_published_products(self):
        for pid in ['P-ENVY-VICHI-01','P-ZESPRI-VICHI-01']:
            data=self.client.get('/api/product-detail/'+pid).get_json()
            self.assertEqual(data['qr_target_url'],'https://xuatxu-web.onrender.com/#detail/'+pid)
            response=self.client.get('/api/generate-qr?product_id='+pid)
            self.assertEqual(response.status_code,200)
            self.assertTrue(response.data.startswith(b'\x89PNG'))
        self.assertEqual(self.client.get('/api/generate-qr?url=https://example.com').status_code,400)
        self.assertEqual(self.client.get('/api/generate-qr?product_id=preview-na').status_code,400)

    def test_technical_simulation_hashes_are_recomputed_not_assumed(self):
        data=self.client.get('/api/tech-demo').get_json()
        self.assertTrue(data['synthetic'])
        self.assertFalse(data['onchain'])
        self.assertEqual(len(data['records']),5)
        previous='GENESIS_SHA256_SIM_ONLY'
        for r in data['records']:
            actual=hashlib.sha256((previous+'|'+r['canonical_payload']).encode()).hexdigest()
            self.assertEqual(r['previous_hash'],previous)
            self.assertEqual(r['sha256'],actual)
            self.assertNotEqual(hashlib.sha256((previous+'|'+r['canonical_payload']+' ').encode()).hexdigest(),r['sha256'])
            previous=actual

    def test_no_feedback_is_fabricated_and_no_debug_or_external_script_required(self):
        self.assertEqual(table('PHAN_HOI_DEMO.csv'),[])
        self.assertEqual(table('LUOT_QUET_DEMO.csv'),[])
        self.assertFalse(app.debug)
        response=self.client.get('/')
        self.assertIn("script-src 'self'",response.headers['Content-Security-Policy'])
        self.assertNotIn('cdnjs',response.text)


if __name__=='__main__': unittest.main(verbosity=2)
