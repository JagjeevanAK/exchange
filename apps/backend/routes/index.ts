import { Router } from "express";
import signup from './signup';
import signin from './signin';
import auth from './auth';
import balance from './balance';
import middlewares from "../middlewares";
import assets from "./assets";
import candles from "./candles";
import trades from "./tradeClose";
import openTrades from "./tradeOpen";
import trade from "./trade";

const router = Router();

// Auth routes (including Google OAuth)
router.use('/auth', auth);

// User routes
router.use('/user', signup);
router.use('/user', signin);
router.use('/user', middlewares.auth, balance);
router.use('/assets', middlewares.auth, assets);
router.use('/candles', candles);
router.use('/trades', middlewares.auth, trades);
router.use('/trades', middlewares.auth, openTrades);
router.use('/trade', middlewares.auth, trade);

export default router;