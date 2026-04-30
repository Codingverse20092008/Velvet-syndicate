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
  console.log('Upload request received');
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) {
    console.log('Upload rejected: not admin');
    return;
  }

  try {
    // Wrap multer in a promise
    await new Promise<void>((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else resolve();
      });
    });

    const file = req.file;
    if (!file) {
      console.log('Upload rejected: no file in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('File uploaded:', file.filename);
    // Return the URL path that can be used as the image field
    const imageUrl = `/uploads/products/${file.filename}`;

    console.log('Returning imageUrl:', imageUrl);
    return successResponse(res, { imageUrl, message: 'Image uploaded' });
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
}));

// POST /api/admin/upload/multiple - Upload multiple images
router.post('/multiple', asyncHandler(async (req: Request, res: Response) => {
  console.log('Multiple upload request received');
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) {
    console.log('Multiple upload rejected: not admin');
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      upload.array('images', 5)(req, res, (err) => {
        if (err) {
          console.error('Multer array error:', err);
          reject(err);
        } else resolve();
      });
    });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log('Multiple upload rejected: no files');
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const imageUrls = files.map(f => `/uploads/products/${f.filename}`);
    console.log('Multiple files uploaded:', files.length, 'URLs:', imageUrls);

    return successResponse(res, { imageUrls, message: 'Images uploaded' });
  } catch (err) {
    console.error('Multiple upload error:', err);
    throw err;
  }
}));

export default router;
