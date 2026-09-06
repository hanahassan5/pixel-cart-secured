import { Router } from "express";
import {
    profile,
    invoice,
    updateProfile,
    importAvatar,
    networkDiagnostics
} from "./user.controller.js";
import { requireAuth } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/profile", requireAuth, profile);
router.post("/profile", requireAuth, updateProfile);
router.get("/invoice", requireAuth, invoice);
router.post("/avatar/import", requireAuth, importAvatar);
router.post("/network-diagnostics", requireAuth, networkDiagnostics);

export default router;
