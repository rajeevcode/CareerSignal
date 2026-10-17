import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


class EvidenceEndpointTests(unittest.TestCase):
    def evaluate(self, cv_text):
        with patch.object(settings, 'openai_api_key', ''), \
             patch.object(settings, 'internal_api_token', 'verification-only'), \
             patch('app.main.sqlite_db.get_candidate', return_value={'id': 'candidate', 'cv_score': 0, 'profile_summary': 'Python summary'}), \
             patch('app.main.sqlite_db.get_candidate_skills', return_value=['Python']), \
             patch('app.main.sqlite_db.get_primary_cv_text', return_value=cv_text), \
             patch('app.main.generate_explanation', new_callable=AsyncMock, return_value={'summary': 'Fixture explanation'}), \
             patch('app.main.analyze_cv_job_gap', new_callable=AsyncMock, return_value={'summary': 'Fixture gap'}), \
             patch('app.main.sqlite_db.save_jd_analysis') as save:
            response = TestClient(app).post('/match/jd', json={'candidate_id': 'candidate', 'jd_text': 'Python development required'}, headers={'X-Internal-Token': 'verification-only'})
            self.assertEqual(response.status_code, 200, response.text)
            result = response.json()
            self.assertEqual(result['cv_score'], 0)
            self.assertEqual(save.call_args.args[4]['evidence'], result['evidence'])
            return result

    def test_source_evidence_is_returned_and_persisted(self):
        result = self.evaluate('Delivered a Python service.')
        self.assertTrue(result['evidence']['cv_text_available'])
        self.assertEqual(result['evidence']['skills'][0]['status'], 'mentioned')

    def test_profile_summary_is_not_mislabeled_as_a_cv_excerpt(self):
        result = self.evaluate(None)
        self.assertFalse(result['evidence']['cv_text_available'])
        self.assertEqual(result['evidence']['skills'][0]['status'], 'unknown')


if __name__ == '__main__':
    unittest.main()
