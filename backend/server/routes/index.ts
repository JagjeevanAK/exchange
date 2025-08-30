import { Router } from "express";
import signup from './signup';
import signin from './signin';

const router = Router();

router.use('/user', signup);
router.use('/user', signin);

export default router;