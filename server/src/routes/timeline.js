import express from 'express';
import {
    getOrderTimeline,
    getMyOrders,
    getDepartmentOrders,
    startDepartmentWork,
    completeDepartmentWork
} from '../controllers/timelineController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Customer routes
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/:orderId/timeline', authMiddleware, getOrderTimeline);

// Employee/Department routes
router.get('/department/orders', authMiddleware, getDepartmentOrders);
router.post('/:orderId/department/start', authMiddleware, startDepartmentWork);
router.post('/:orderId/department/complete', authMiddleware, completeDepartmentWork);

export default router;
