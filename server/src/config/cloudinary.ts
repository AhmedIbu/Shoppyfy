import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { ApiError } from '../utils/ApiError';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const isCloudinaryConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

/** Uploads an in-memory file buffer to Cloudinary and returns the secure URL. */
export const uploadBuffer = (
  buffer: Buffer,
  folder = 'semmai/products'
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        ApiError.badRequest(
          'Image hosting is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
        )
      );
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          return reject(
            ApiError.badRequest(`Image upload failed: ${error?.message ?? 'unknown error'}`)
          );
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

export const deleteImage = (publicId: string) => cloudinary.uploader.destroy(publicId);

export { cloudinary };
