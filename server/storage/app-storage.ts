// VPS-compatible local file storage
// This replaces the Replit Object Storage client with local filesystem storage.
// All chapter images are stored in data/storage/ and served via /api/chapters/image/
export { uploadImage, deleteImage, listImages } from './local-storage';
export { getImageBuffer as getImageBytes } from './local-storage';
import { Readable } from 'stream';
import { getImageBuffer } from './local-storage';

export async function getImageStream(filename: string): Promise<Readable> {
  const buffer = await getImageBuffer(filename);
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}
