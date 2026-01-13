import { Router } from 'express';
import signup from './signup';
import signin from './signin';
import auth from './auth';
import balance from './balance';
import middlewares from '../middlewares';
import assets from './assets';
import candles from './candles';
import tradeClose from './tradeClose';
import tradeOpen from './tradeOpen';
import trade from './trade';
import pendingOrders from './pendingOrders';

const router = Router();

router.use('/auth', auth);
router.use('/user', signup);
router.use('/user', signin);
router.use('/user', middlewares.auth, balance);
router.use('/assets', middlewares.auth, assets);
router.use('/candles', candles);

// Trade routes
// POST /trade - Open a new trade (market or limit)
router.use('/trade', middlewares.auth, trade);

// GET /trades/open - Get open trades
// GET /trades/closed - Get closed trades
// POST /trades/:id/close - Close a trade
router.use('/trades', middlewares.auth, tradeOpen);
router.use('/trades', middlewares.auth, tradeClose);

// Pending/Limit order routes
// GET /orders/pending - Get pending limit orders
// DELETE /orders/:id - Cancel a pending order
// PUT /orders/:id - Modify a pending order
router.use('/orders', middlewares.auth, pendingOrders);

export default router;
