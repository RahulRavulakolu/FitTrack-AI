import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import crypto from 'node:crypto';
import { HttpError } from '../middleware.js';
export const cloudConfigured = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
export async function cleanImage(file: Express.Multer.File | undefined) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
    throw new HttpError(400, 'Choose a JPG, PNG or WebP image.');
  try {
    return await sharp(file.buffer, { limitInputPixels: 25000000 })
      .rotate()
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      'That image could not be decoded. Please choose a smaller, valid image.',
    );
  }
}
export async function saveImage(buffer: Buffer, userId: string) {
  const filename = crypto.randomUUID() + '.webp';
  if (cloudConfigured()) {
    configure();
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `fittrack/${userId}`, resource_type: 'image' },
        (err, r) => (err ? reject(err) : resolve(r)),
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  if (process.env.NODE_ENV === 'production' && process.env.LOCAL_UPLOADS_ENABLED !== 'true')
    throw new HttpError(503, 'Photo storage is not configured on the server.');
  const folder = resolve('.data/uploads', userId);
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, filename), buffer);
  return { url: `/api/images/${userId}/${filename}`, publicId: '' };
}
export async function deleteUserImages(userId: string) {
  if (cloudConfigured()) {
    configure();
    await cloudinary.api.delete_resources_by_prefix(`fittrack/${userId}/`);
  }
  const root = resolve('.data/uploads');
  const folder = resolve(root, userId);
  if (!/^[a-f0-9]{24}$/.test(userId) || !folder.startsWith(root + sep))
    throw new Error('Invalid image directory');
  await rm(folder, { recursive: true, force: true });
}
export async function removePhoto(url: string, publicId?: string) {
  if (publicId && cloudConfigured()) {
    configure();
    await cloudinary.uploader.destroy(publicId);
  } else if (url?.startsWith('/api/images/')) {
    const match = url.match(/^\/api\/images\/([a-f0-9]{24})\/([a-f0-9-]+\.webp)$/);
    if (match) await rm(resolve('.data/uploads', match[1], match[2]), { force: true });
  }
}
