import { Router } from "express";
import {
    getStatistics,
    listUsers,
    listOrders,
    updateOrderStatus
} from "./admin.controller.js";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { requireAdmin } from "../../middleware/adminMiddleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", getStatistics);
router.get("/users", listUsers);
router.get("/orders", listOrders);
router.patch("/orders/:id", updateOrderStatus);

export default router;
