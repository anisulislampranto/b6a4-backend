import express, { Router } from "express";
import { BrandController } from "./brand.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = express.Router();

router.post("/", auth(UserRole.ADMIN), BrandController.createBrand);
router.get("/", BrandController.getBrands);
router.delete("/:id", auth(UserRole.ADMIN), BrandController.deleteBrand);

export const brandRouter: Router = router;