import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { listOrders, getOrder, checkout } from "./order.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", checkout);
router.get("/", listOrders);
router.get("/:id", getOrder);

export default router;
