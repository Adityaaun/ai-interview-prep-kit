import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { registerSchema, loginSchema } from '../schemas/authSchemas';
import { requireAuth, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const user = new User({ email: data.email, password: data.password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'development_secret_key_12345', { expiresIn: '7d' });
    
    // Determine if we are in a deployed environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await User.findOne({ email: data.email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(data.password, user.password as string);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'development_secret_key_12345', { expiresIn: '7d' });
    
    // Determine if we are in a deployed environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', user: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
