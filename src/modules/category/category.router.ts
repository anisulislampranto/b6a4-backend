import express, { Router } from "express";
import { CategoryController } from "./category.controller";

const router = express.Router();

router.post("/", CategoryController.createCategory);

export const categoryRouter: Router = router;