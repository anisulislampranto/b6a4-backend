import { Request, Response } from "express";
import { brandService } from "./brandh.service";

const createBrand = async (req: Request, res: Response) => {
    try {
        const brand = await brandService.createBrand(req.body);
        res.status(201).json({
            data: brand,
            message: 'Created brand successfully!'
        });
    } catch (err) {
        res.status(400).json({ message: "Failed to create brand", error: err });
    }
}

export const BrandController = {
    createBrand
}