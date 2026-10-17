import unittest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from app import db
from app.main import app
from app.config import settings


class PrivateJobAccessTests(unittest.TestCase):
    def test_privileged_job_lookup_is_scoped_to_owner_or_published_jobs(self):
        conn = MagicMock()
        conn.execute.return_value.fetchone.return_value = None

        @contextmanager
        def connection():
            yield conn

        with patch.object(db, 'get_conn', connection):
            self.assertIsNone(db.get_job('job', 'candidate'))
            query, args = conn.execute.call_args.args
            self.assertIn("captured_by IS NULL AND status = 'published'", query)
            self.assertIn('captured_by = %s', query)
            self.assertEqual(args, ('job', 'candidate'))
            db.get_job('job')
            self.assertEqual(conn.execute.call_args.args[1], ('job', None))

    def test_private_jobs_never_reach_generation(self):
        with patch.object(settings, 'internal_api_token', 'verification-only'), \
             patch('app.main.sqlite_db.get_candidate', return_value={'id': 'candidate'}), \
             patch('app.main.sqlite_db.get_primary_cv_text', return_value='Source CV'), \
             patch('app.main.sqlite_db.get_job', return_value=None) as lookup, \
             patch('app.main.rewrite_single_bullet', new_callable=AsyncMock) as generate:
            client = TestClient(app)
            for endpoint, body in [
                ('/match', {'candidate_id': 'candidate', 'job_id': 'private'}),
                ('/analyze-gap', {'candidate_id': 'candidate', 'job_id': 'private'}),
                ('/cover-letter/generate', {'candidate_id': 'candidate', 'job_id': 'private'}),
                ('/interview-prep/generate', {'candidate_id': 'candidate', 'job_id': 'private'}),
                ('/rewrite-bullet', {'candidate_id': 'candidate', 'job_id': 'private', 'bullet': 'Real achievement'}),
            ]:
                with self.subTest(endpoint=endpoint):
                    response = client.post(endpoint, json=body, headers={'X-Internal-Token': 'verification-only'})
                    self.assertEqual(response.status_code, 404, response.text)
                    lookup.assert_called_with('private', 'candidate')
            generate.assert_not_called()
