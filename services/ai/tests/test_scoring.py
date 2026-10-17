import unittest
from app.scoring.interview_signal_engine import availability_score, compute_interview_signal
from app.matching.engine import competition_score
from app.scoring.jd_match_engine import job_dict_from_jd_text
from app.scoring.evidence import build_evidence_report
from app.analyzer.cv_job_analyzer import _fallback_gap_analysis


class ScoringTests(unittest.TestCase):
    def test_notice_period_boundaries(self):
        for notice, expected in [('immediate', 95), ('0', 95), ('0 days', 95), ('15 days', 85),
                                  ('2 weeks', 85), ('30 days', 75), ('1 month', 75),
                                  ('60 days', 65), ('90 days', 65), ('unknown', 65), (None, 60)]:
            with self.subTest(notice=notice):
                self.assertEqual(availability_score({'notice_period': notice}), expected)

    def test_unknown_competition_does_not_mean_low_competition(self):
        for count in [None, 0, -1]:
            self.assertEqual(competition_score(count), 50)
        self.assertEqual(competition_score(5), 90)
        self.assertEqual(competition_score(500), 25)

    def test_pasted_jd_does_not_invent_applicants(self):
        self.assertIsNone(job_dict_from_jd_text('Python developer')['applicant_count'])

    def test_signal_is_bounded_for_valid_inputs(self):
        for jd in [0, 50, 100]:
            for cv in [0, 50, 100]:
                score = compute_interview_signal(jd, cv, {}, {})
                self.assertGreaterEqual(score, 0)
                self.assertLessEqual(score, 100)


class RewriteAvailabilityTests(unittest.TestCase):
    def test_missing_provider_does_not_invent_rewrites_or_score_uplift(self):
        result = _fallback_gap_analysis({"required_skills": ["Python"]}, [], 42, cv_text="Built Python services.")
        self.assertEqual(result["generation_mode"], "unavailable")
        self.assertIsNone(result["projected_fit"])
        self.assertIsNone(result["ats_match_score"])
        self.assertEqual(result["suggested_summary"], "")
        self.assertEqual(result["bullet_rewrites"], [])
        self.assertEqual(result["missing_keywords"], [])


class EvidenceTests(unittest.TestCase):
    def test_only_quotes_skills_present_in_source_job(self):
        result = build_evidence_report({'description': 'Experience with Python and Rust.',
                                       'required_skills': ['Python', 'Rust', 'Invented', 'Python']},
                                      'Delivered a PYTHON service. Trusted colleague.')
        self.assertEqual(len(result['skills']), 2)
        python, rust = result['skills']
        self.assertEqual(python['status'], 'mentioned')
        self.assertEqual(python['cv_excerpt'], 'Delivered a PYTHON service.')
        self.assertEqual(rust['status'], 'not_found')  # Trusted is not Rust.
        self.assertIsNone(rust['cv_excerpt'])

    def test_absent_cv_is_unknown_not_missing_qualification(self):
        result = build_evidence_report({'description': 'Python skills.', 'required_skills': ['Python']}, '')
        self.assertEqual(result['skills'][0]['status'], 'unknown')
        self.assertFalse(result['cv_text_available'])

    def test_long_pdf_line_keeps_the_actual_evidence_in_excerpt(self):
        text = 'a ' * 500 + 'Python service shipped.'
        report = build_evidence_report({'description': 'Python', 'required_skills': ['Python']}, text)
        self.assertIn('Python', report['skills'][0]['cv_excerpt'])
        self.assertIn(report['skills'][0]['cv_excerpt'], text)


if __name__ == '__main__':
    unittest.main()
