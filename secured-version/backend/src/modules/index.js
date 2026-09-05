import { Router } from "express";

import productRouter from "./products/product.router.js";
import authRouter from "./auth/auth.router.js";
import userRouter from "./users/user.router.js";
import adminRouter from "./admin/admin.router.js";
import cartRouter from "./cart/cart.router.js";
import orderRouter from "./orders/order.router.js";

const router = Router();

router.get("/", (req, res) => res.json({ message: "API is working" }));

router.use("/products", productRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/admin", adminRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);

export default router;