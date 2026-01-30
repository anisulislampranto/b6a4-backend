import express, { Router } from "express";
import { BrandController } from "./brand.controller";

const router = express.Router();

router.post("/", BrandController.createBrand);

export const categoryRouter: Router = router;