import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { env } from './env';
import { logger } from './logger';

// Configure Cloudinary only if credentials are provided
const isConfigured = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary configured for permanent storage');
} else {
  logger.warn('Cloudinary not configured. Falling back to ephemeral local storage.');
}

export const cloudinaryStorage = isConfigured
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'velvet-syndicate/products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
        transformation: [{ width: 1000, height: 1250, crop: 'limit' }],
      } as any,
    })
  : null;

export { cloudinary, isConfigured };
