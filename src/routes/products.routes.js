import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  patchProduct,
  replaceProduct,
} from "../controllers/products.controller.js";
import { validateProduct } from "../middleware/validate-product.middleware.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", validateProduct, createProduct);
router.put("/:id", validateProduct, replaceProduct);
router.patch("/:id", validateProduct, patchProduct);
router.delete("/:id", deleteProduct);

export default router;
