import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const userRole = role || 'SPECTATOR';

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email, passwordHash, phone || null, userRole);

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    user: { id, name, email, role: userRole },
    token,
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_image: user.profile_image },
    token,
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  const { name, phone } = req.body;
  const db = getDb();

  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user!.id);
  }
  if (phone !== undefined) {
    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, req.user!.id);
  }

  const updated = db.prepare('SELECT id, name, email, role, phone, profile_image FROM users WHERE id = ?')
    .get(req.user!.id);

  res.json({ user: updated });
});

// GET /api/auth/users (admin only)
router.get('/users', authMiddleware, (req: Request, res: Response) => {
  if (req.user!.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// POST /api/auth/firebase-sync
router.post('/firebase-sync', (req: Request, res: Response) => {
  const { email, name, photoURL } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required from Firebase auth' });
    return;
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user) {
    // Auto-create user from Firebase identity
    const id = uuid();
    const displayName = name || email.split('@')[0];
    const defaultRole = 'SPECTATOR';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, profile_image, role)
      VALUES (?, ?, ?, 'FIREBASE_AUTH', ?, ?)
    `).run(id, displayName, email, photoURL || null, defaultRole);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_image: user.profile_image },
    token,
  });
});

export default router;
