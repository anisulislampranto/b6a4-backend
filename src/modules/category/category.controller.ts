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

export const CategoryController = {
    createCategory,
}