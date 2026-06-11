import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

/** Uploads an in-memory file buffer to Cloudinary and returns the secure URL. */
export const uploadBuffer = (
  buffer: Buffer,
  folder = 'shoppyfy/products'
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

export const deleteImage = (publicId: string) => cloudinary.uploader.destroy(publicId);

export { cloudinary };
