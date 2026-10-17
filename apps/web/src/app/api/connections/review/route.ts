import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import {
  getDb,
  careerIntegrationItems,
  applications,
  toIsoNow,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { record, text } from '@/lib/career-intelligence';
export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile missing' }, { status: 404 });
  try {
    const body = record(await request.json());
    const id = text(body, 'id', 36, true),
      expectedUpdatedAt = text(body, 'expectedUpdatedAt', 64, true),
      applicationId = text(body, 'applicationId', 36);
    const accepted = await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(careerIntegrationItems)
        .where(
          and(
            eq(careerIntegrationItems.id, id),
            eq(careerIntegrationItems.candidateId, candidate.id),
            isNull(careerIntegrationItems.reviewedAt),
            eq(careerIntegrationItems.updatedAt, expectedUpdatedAt),
          ),
        )
        .for('update');
      if (!item) return false;
      if (body.dismiss !== true) {
        if (
          !applicationId ||
          !['interview', 'rejected'].includes(item.proposedStatus ?? '')
        )
          throw new Error('Choose an application for a suggested stage');
        const [current] = await tx
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.id, applicationId),
              eq(applications.candidateId, candidate.id),
            ),
          )
          .for('update');
        if (!current) throw new Error('Application not found');
        if (
          ['offer', 'rejected', 'ghosted'].includes(current.status) &&
          current.status !== item.proposedStatus
        )
          throw new Error('Closed application requires a manual stage update');
        const status =
          item.proposedStatus === 'interview' &&
          [
            'hr_screen',
            'technical_round',
            'case_study',
            'final_round',
          ].includes(current.status)
            ? current.status
            : (item.proposedStatus as 'interview' | 'rejected');
        const [app] = await tx
          .update(applications)
          .set({
            status,
            followUpDueAt: null,
            updatedAt: toIsoNow(),
          })
          .where(
            and(
              eq(applications.id, applicationId),
              eq(applications.candidateId, candidate.id),
            ),
          )
          .returning({ id: applications.id });
        if (!app) throw new Error('Application not found');
      }
      await tx
        .update(careerIntegrationItems)
        .set({
          reviewedAt: toIsoNow(),
          applicationId: body.dismiss === true ? null : applicationId,
        })
        .where(eq(careerIntegrationItems.id, id));
      return true;
    });
    return NextResponse.json(
      { success: accepted },
      { status: accepted ? 200 : 409 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'Unable to apply this suggestion. Review the item and try again.',
      },
      { status: 400 },
    );
  }
}
