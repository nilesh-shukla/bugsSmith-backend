import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/pdf'
  ];
  const ext = (file.originalname || '').toLowerCase();
  if (allowedMimes.includes(file.mimetype) || ext.endsWith('.csv') || ext.endsWith('.pdf')) {
    return cb(null, true);
  }
  return cb(new Error('Unsupported file type'), false);
};

export const uploadMiddleware = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
