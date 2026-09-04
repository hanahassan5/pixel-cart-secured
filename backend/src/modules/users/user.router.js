import { Router } from "express";
import { profile, invoice } from "./user.controller.js";
import { requireAuth } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/profile", requireAuth, profile);
router.get("/invoice", requireAuth, invoice);

export default router;
