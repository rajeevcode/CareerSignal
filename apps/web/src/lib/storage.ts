import path from 'path';

export function getUploadsDir() {
  if (process.env.UPLOADS_PATH) {
    return path.resolve(process.env.UPLOADS_PATH);
  }
  return path.resolve(process.cwd(), 'data', 'uploads');
}

export async function saveUploadedFile(relativePath: string, buffer: ArrayBuffer) {
  const fs = await import('fs/promises');
  const fullPath = path.join(getUploadsDir(), relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(buffer));
  return fullPath;
}
