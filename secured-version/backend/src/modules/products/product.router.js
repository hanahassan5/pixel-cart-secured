import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { requireAdmin } from "../../middleware/adminMiddleware.js";
import { createUploader } from "../../middleware/uploader.js";
import * as productController from "./product.controller.js";

const productUploader = createUploader({
    folder: "products",
    type: "images"
});

const router = Router();

router.get("/", productController.listProducts);
router.get("/download", productController.download);
router.get("/:id", productController.getProduct);

router.get("/:id/reviews", productController.getReviews);
router.post("/:id/reviews", requireAuth, productController.addReview);

router.post("/", requireAuth, requireAdmin, productUploader.single("image"), productController.createProduct);
router.put("/:id", requireAuth, requireAdmin, productUploader.single("image"), productController.updateProduct);
router.delete("/:id", requireAuth, requireAdmin, productController.deleteProduct);

export default router;
