import express, { Router } from "express";
import { BrandController } from "./brand.controller";

const router = express.Router();

router.post("/", BrandController.createBrand);
router.get("/", BrandController.getBrands);

export const brandRouter: Router = router;