import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../../config/logger';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadBufferToCloudinary = (buffer: Buffer, filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        public_id: filename,
        folder: 'prof_ada_documents',
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary Upload Error:', error);
          return reject(error);
        }
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
};
