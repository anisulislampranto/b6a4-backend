import { Request, Response } from "express";
import { categoryService } from "./category.service";

const createCategory = async (req: Request, res: Response) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({
            data: category,
            message: 'Category Created successfully!'
        });
    } catch (err) {
        res.status(400).json({ message: "Failed to create category", error: err });
    }
}

const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json({
            data: categories,
            message: 'Fetched All Categories!'
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to get all category", error: error });
    }
}

const deleteCategory = async (req: Request, res: Response) => {
    try {
        await categoryService.deleteCategory(req.params.id as string);
        res.json({ message: "Category disabled" });
    } catch (error) {
        res.status(400).json({ message: "Failed to get all category", error: error });
    }
}

export const CategoryController = {
    createCategory,
    getAllCategories,
    deleteCategory
}