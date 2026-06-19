import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listCvUploads } from '@/lib/queries';
import { CVUploadClient } from './CVUploadClient';

export default async function CVPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const cvs = (await listCvUploads(candidate.id)).map((cv) => ({
    id: cv.id,
    file_name: cv.fileName,
    ats_score: cv.atsScore,
    uploaded_at: cv.uploadedAt,
    is_primary: cv.isPrimary,
  }));

  return <CVUploadClient candidateId={candidate.id} existingCvs={cvs} />;
}
