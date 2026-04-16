import express, { Router } from "express";
import { CategoryController } from "./category.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = express.Router();

router.post("/", auth(UserRole.ADMIN), CategoryController.createCategory);
router.get("/", CategoryController.getAllCategories);
router.delete("/:id", auth(UserRole.ADMIN), CategoryController.deleteCategory);

export const categoryRouter: Router = router;