import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { getCart, addToCart, updateCart, removeFromCart } from "./cart.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:productId", updateCart);
router.delete("/:productId", removeFromCart);

export default router;
