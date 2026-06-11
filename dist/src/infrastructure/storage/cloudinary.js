"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const logger_1 = require("../../config/logger");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadBufferToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            resource_type: 'auto',
            public_id: filename,
            folder: 'prof_ada_documents',
        }, (error, result) => {
            if (error) {
                logger_1.logger.error('Cloudinary Upload Error:', error);
                return reject(error);
            }
            resolve(result?.secure_url || '');
        });
        uploadStream.end(buffer);
    });
};
exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
