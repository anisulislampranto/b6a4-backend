import express, { Router } from "express";
import { BrandController } from "./brand.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = express.Router();

router.post("/", auth(UserRole.ADMIN, UserRole.SELLER), BrandController.createBrand);
router.get("/", BrandController.getBrands);

export const brandRouter: Router = router;