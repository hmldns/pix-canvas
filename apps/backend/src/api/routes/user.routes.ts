import { Router } from 'express';
import { createUser, getCurrentUser } from '../controllers/user.controller';

const router = Router();

// POST /api/users - Create a new user session
router.post('/', createUser);

// GET /api/users/me - Get current user information
router.get('/me', getCurrentUser);

export default router;