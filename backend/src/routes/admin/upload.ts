import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import multer from 'multer';
import path from 'path';
import crypto from 'node:crypto';
import fs from 'fs';

const router = Router();

// Admin middleware
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user as any).role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
};

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config - store to disk
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, gif)'));
    }
  },
});

// POST /api/admin/upload - Upload single image
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  // Wrap multer in a promise
  await new Promise<void>((resolve, reject) => {
    upload.single('image')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // Return the URL path that can be used as the image field
  const imageUrl = `/uploads/products/${file.filename}`;

  return successResponse(res, { imageUrl, message: 'Image uploaded' });
}));

// POST /api/admin/upload/multiple - Upload multiple images
router.post('/multiple', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  await new Promise<void>((resolve, reject) => {
    upload.array('images', 5)(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  const imageUrls = files.map(f => `/uploads/products/${f.filename}`);

  return successResponse(res, { imageUrls, message: 'Images uploaded' });
}));

export default router;
