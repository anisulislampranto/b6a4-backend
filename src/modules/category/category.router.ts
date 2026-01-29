import express, { Router } from "express";
import { CategoryController } from "./category.controller";

const router = express.Router();

router.post("/", CategoryController.createCategory);
router.get("/", CategoryController.getAllCategories);
router.delete("/:id", CategoryController.deleteCategory);

export const categoryRouter: Router = router;