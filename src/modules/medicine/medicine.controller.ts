import { Request, Response } from "express";
import { medicineService } from "./medicine.service";

const getAllMedicines = async (req: Request, res: Response) => {
    try {
        const medicines = await medicineService.getAllMedicines(req.query);
        res.json({
            data: medicines,
            message: 'Fetched All Medicines!'
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to get all medicines", error: error });
    }
}

export const MedicineController = {
    getAllMedicines
}