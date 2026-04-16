import { Router } from "express";
import { MedicineController } from "./medicine.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = Router();

router.post("/", auth(UserRole.SELLER, UserRole.ADMIN), MedicineController.createMedicine);
router.get("/my", auth(UserRole.SELLER, UserRole.ADMIN), MedicineController.getMyMedicines);
router.patch("/:id", auth(UserRole.SELLER, UserRole.ADMIN), MedicineController.updateMedicine);
router.get("/:id", MedicineController.getMedicineById);
router.get("/", MedicineController.getAllMedicines);

export const medicineRouter: Router = router;
