import express from 'express';
import { createPayment, verifyPayment,getPaymentByOrderId } from '../controllers/payment.controller.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/create/:orderId', createAuthMiddleware(['user',"seller"]), createPayment);
router.post('/verify-payment', createAuthMiddleware(['user',"seller"]), verifyPayment);
router.get('/status/:orderId', createAuthMiddleware(['user',"seller"]), getPaymentByOrderId);

export default router;