import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getDb, OWNER_EMAIL } from './db.ts';

const router = express.Router();
const db = getDb();

// Setup upload folders
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const FILES_DIR = path.join(UPLOADS_DIR, 'files');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

// Multer storage for images
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الصورة غير مدعومة. الصيغ المسموحة: JPG, JPEG, PNG, WEBP'));
    }
  }
});

// Multer storage for resource files (.mcpack, .mcaddon, .mcworld, .zip)
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FILES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mcpack';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^\w\u0621-\u064A-]/g, '_').slice(0, 30);
    const safeName = `${cleanBase}_${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

const resourceFileUpload = multer({
  storage: fileStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.mcpack', '.mcaddon', '.mcworld', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || file.mimetype.includes('zip') || file.mimetype.includes('octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة. الصيغ المسموحة: .mcpack, .mcaddon, .mcworld, .zip'));
    }
  }
});

// Helper for extracting auth token
function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return req.cookies?.zork_session;
}

// Middleware: Owner Authentication Guard
function requireOwner(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  const check = db.validateSession(token);
  if (!check.valid) {
    return res.status(401).json({
      success: false,
      errorCode: 'SESSION_EXPIRED',
      error: 'غير مصرح بالدخول. يلزم تسجيل دخول المالك.'
    });
  }
  (req as any).ownerSession = check.session;
  (req as any).mustChangePassword = check.mustChangePassword;
  next();
}

// Middleware: Enforce Password Rotation if required
function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if ((req as any).mustChangePassword) {
    return res.status(403).json({
      success: false,
      mustChangePassword: true,
      error: 'يجب تغيير كلمة المرور المؤقتة أولاً قبل الوصول للوحة التحكم.'
    });
  }
  next();
}

// --- AUTH ROUTES ---
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'unknown';

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
    });
  }

  const result = db.authenticateOwner(email, password, ip, ua);
  if (!result.success || !result.session) {
    const statusCode = result.errorCode === 'UNAUTHORIZED_EMAIL' ? 403 : 401;
    return res.status(statusCode).json({
      success: false,
      errorCode: result.errorCode || 'INVALID_CREDENTIALS',
      error: result.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
    });
  }

  // Set secure HttpOnly cookie
  res.cookie('zork_session', result.session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    success: true,
    token: result.session.token,
    mustChangePassword: result.mustChangePassword
  });
});

router.get('/auth/me', (req, res) => {
  const token = getAuthToken(req);
  const check = db.validateSession(token);
  if (!check.valid) {
    return res.json({
      authenticated: false,
      errorCode: 'SESSION_EXPIRED',
      error: 'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجددًا.'
    });
  }
  return res.json({
    authenticated: true,
    email: OWNER_EMAIL,
    mustChangePassword: check.mustChangePassword
  });
});

router.post('/auth/change-password', requireOwner, (req, res) => {
  const token = getAuthToken(req)!;
  const { currentPassword, newPassword } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كلمة المرور الحالية والجديدة.' });
  }

  const result = db.changeOwnerPassword(token, currentPassword, newPassword, ip);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح.' });
});

router.post('/auth/revoke-sessions', requireOwner, (req, res) => {
  const token = getAuthToken(req)!;
  const count = db.revokeOtherSessions(token);
  return res.json({ success: true, revokedCount: count });
});

router.post('/auth/logout', (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    db.logoutSession(token);
  }
  res.clearCookie('zork_session');
  return res.json({ success: true });
});

// --- RESOURCES ROUTES ---
router.get('/resources', (req, res) => {
  const { category, search, sort, includeDrafts } = req.query;
  const token = getAuthToken(req);
  const isOwner = db.validateSession(token).valid;

  const resources = db.getResources({
    category: category as any,
    search: search as string,
    sort: sort as any,
    includeDrafts: isOwner && includeDrafts === 'true'
  });

  return res.json({ success: true, resources });
});

router.get('/resources/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const token = getAuthToken(req);
  const isOwner = db.validateSession(token).valid;

  const resource = db.getResourceByIdOrSlug(idOrSlug, isOwner);
  if (!resource) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود.' });
  }

  return res.json({ success: true, resource });
});

router.post('/resources', requireOwner, requirePasswordChanged, (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = ip.slice(0, 12);

  try {
    const resource = db.createResource(req.body);
    db.addAuditLog('resource_created', `Created resource: ${resource.title}`, ipHash, true);
    return res.json({ success: true, resource });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/resources/:id', requireOwner, requirePasswordChanged, (req, res) => {
  const { id } = req.params;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = ip.slice(0, 12);

  const updated = db.updateResource(id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود.' });
  }

  db.addAuditLog('resource_updated', `Updated resource: ${updated.title}`, ipHash, true);
  return res.json({ success: true, resource: updated });
});

router.delete('/resources/:id', requireOwner, requirePasswordChanged, (req, res) => {
  const { id } = req.params;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = ip.slice(0, 12);

  const resObj = db.getResourceByIdOrSlug(id, true);
  const deleted = db.deleteResource(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود.' });
  }

  db.addAuditLog('resource_deleted', `Deleted resource: ${resObj?.title || id}`, ipHash, true);
  return res.json({ success: true });
});

router.post('/resources/:id/toggle-publish', requireOwner, requirePasswordChanged, (req, res) => {
  const { id } = req.params;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = ip.slice(0, 12);

  const updated = db.togglePublishResource(id);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'المورد غير موجود.' });
  }

  db.addAuditLog('resource_published', `Toggled publish state for: ${updated.title} -> ${updated.is_published ? 'منشور' : 'مسودة'}`, ipHash, true);
  return res.json({ success: true, resource: updated });
});

// --- CATEGORIES ROUTE ---
router.get('/categories', (_req, res) => {
  const categories = db.getCategories();
  return res.json({ success: true, categories });
});

// --- UPLOAD ROUTES ---
router.post('/upload/image', requireOwner, imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'لم يتم استلام أي صورة.' });
  }

  const relativeUrl = `/uploads/images/${req.file.filename}`;
  return res.json({
    success: true,
    url: relativeUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

router.post('/upload/images', requireOwner, imageUpload.array('images', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'لم يتم استلام أي صور.' });
  }

  const urls = files.map(f => `/uploads/images/${f.filename}`);
  return res.json({
    success: true,
    urls,
    count: urls.length
  });
});

router.post('/upload/file', requireOwner, resourceFileUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'لم يتم استلام أي ملف مورد.' });
  }

  const relativePath = `/uploads/files/${req.file.filename}`;
  return res.json({
    success: true,
    filePath: relativePath,
    fileName: req.file.originalname,
    fileSize: req.file.size
  });
});

// --- DOWNLOAD ENGINE ROUTES ---
router.post('/download/:id', (req, res) => {
  const { id } = req.params;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'unknown';

  const result = db.registerDownloadHandoff(id, ip, ua);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    downloadType: result.downloadType,
    downloadUrl: result.downloadUrl,
    fileName: result.fileName
  });
});

router.get('/download/file/:id', (req, res) => {
  const { id } = req.params;
  const resource = db.getResourceByIdOrSlug(id);
  if (!resource || !resource.is_published) {
    return res.status(404).send('المورد غير متاح.');
  }

  if (resource.download_type !== 'internal' || !resource.internal_file_path) {
    return res.status(400).send('هذا المورد لا يستخدم تنزيل الملفات المباشر.');
  }

  const fullPath = path.resolve(process.cwd(), resource.internal_file_path.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('ملف التحميل غير موجود على الخادم.');
  }

  return res.download(fullPath, resource.internal_file_name || `${resource.slug}.mcpack`);
});

// --- STATS, SETTINGS & AUDIT LOGS ---
router.get('/stats', requireOwner, (_req, res) => {
  const stats = db.getStats();
  return res.json({ success: true, stats });
});

router.get('/audit-logs', requireOwner, (_req, res) => {
  const logs = db.getAuditLogs();
  return res.json({ success: true, logs });
});

router.get('/settings', (_req, res) => {
  const settings = db.getSettings();
  return res.json({ success: true, settings });
});

router.put('/settings', requireOwner, requirePasswordChanged, (req, res) => {
  const updated = db.updateSettings(req.body);
  return res.json({ success: true, settings: updated });
});

export default router;
