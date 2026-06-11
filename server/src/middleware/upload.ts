import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|avif|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only image files are allowed'));
    }
  },
});
