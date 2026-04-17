import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get("/customer", auth(UserRole.CUSTOMER), DashboardController.getCustomerDashboard);
router.get("/seller", auth(UserRole.SELLER), DashboardController.getSellerDashboard);
router.get("/admin", auth(UserRole.ADMIN), DashboardController.getAdminDashboard);

export const dashboardRouter: Router = router;
