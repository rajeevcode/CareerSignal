import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const CV_BUCKET = 'cv-uploads';

function contentTypeFor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
}

/**
 * Upload a CV to the private `cv-uploads` Supabase Storage bucket.
 * `objectPath` must start with the user's id ("<userId>/...") to satisfy the
 * per-user-folder storage RLS policy. Returns the stored object path.
 */
export async function saveUploadedFile(objectPath: string, buffer: ArrayBuffer) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(CV_BUCKET).upload(objectPath, Buffer.from(buffer), {
    contentType: contentTypeFor(objectPath),
    upsert: true,
  });
  if (error) throw new Error(`CV upload failed: ${error.message}`);
  return objectPath;
}

/** Create a short-lived signed URL for a private CV object. */
export async function getSignedCvUrl(objectPath: string, expiresInSeconds = 60 * 60) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(CV_BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/** Delete a CV object. */
export async function deleteCvFile(objectPath: string) {
  const admin = createSupabaseAdminClient();
  await admin.storage.from(CV_BUCKET).remove([objectPath]);
}
