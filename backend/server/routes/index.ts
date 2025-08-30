import { Router } from "express";
import signup from './signup';
import signin from './signin';
import balance from './balance';
import middlewares from "../middlewares";

const router = Router();

router.use('/user', signup);
router.use('/user', signin);
router.use('/user', middlewares.auth, balance);

export default router;