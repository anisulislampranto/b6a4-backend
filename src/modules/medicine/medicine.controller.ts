import { Request, Response } from "express";
import { medicineService } from "./medicine.service";

const createMedicine = async (req: Request, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                message: "You are not authorized!",
            });
        }

        const medicine = await medicineService.createMedicine(req.body, req.user.id);
        res.status(201).json({
            data: medicine,
            message: "Medicine added successfully!",
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to add medicine", error });
    }
};

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

const getMyMedicines = async (req: Request, res: Response) => {
    try {
        if (!req.user?.id || !req.user?.role) {
            return res.status(401).json({
                message: "You are not authorized!",
            });
        }

        const medicines = await medicineService.getMyMedicines(req.user.id, req.user.role);
        res.json({
            data: medicines,
            message: "Fetched medicines successfully!",
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to fetch medicines", error });
    }
}

const updateMedicine = async (req: Request, res: Response) => {
    try {
        if (!req.user?.id || !req.user?.role) {
            return res.status(401).json({
                message: "You are not authorized!",
            });
        }

        const medicine = await medicineService.updateMedicine(req.params.id as string, req.body, req.user.id, req.user.role);
        res.json({
            data: medicine,
            message: "Medicine updated successfully!",
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to update medicine", error });
    }
}

export const MedicineController = {
    createMedicine,
    getAllMedicines,
    getMyMedicines,
    updateMedicine
}
