import { Router } from 'express';
import { getNotes, getNoteById, createNote } from '../controllers/noteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);

export default router;
