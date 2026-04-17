import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { ReviewController } from "./review.controller";

const router = Router();

router.get("/medicine/:medicineId", ReviewController.getMedicineReviews);
router.post("/", auth(UserRole.CUSTOMER), ReviewController.createReview);

export const reviewRouter: Router = router;
