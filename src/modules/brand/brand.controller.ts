import { Request, Response } from "express";
import { brandService } from "./brandh.service";

const createBrand = async (req: Request, res: Response) => {
    try {
        const brand = await brandService.createBrand({data: req.body});
        res.status(201).json({
            data: brand,
            message: 'Created brand successfully!'
        });
    } catch (err) {
        res.status(400).json({ message: "Failed to create brand", error: err });
    }
}

const getBrands = async (req: Request, res: Response) => {
    try {
        const brands = await brandService.getBrands();
        res.status(200).json({
            data: brands,
            message: 'Fetched brands successfully!'
        });
    } catch (err) {
        res.status(400).json({ message: "Failed to create brand", error: err });
    }
}

export const BrandController = {
    createBrand,
    getBrands
}