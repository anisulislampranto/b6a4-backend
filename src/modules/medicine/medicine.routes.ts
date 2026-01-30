import { Router } from "express";
import { MedicineController } from "./medicine.controller";

const router = Router();

router.get("/", MedicineController.getAllMedicines); 

export const medicineRouter: Router = router;