import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get("/my", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), NotificationController.listMyNotifications);
router.patch("/:id/read", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), NotificationController.markRead);
router.patch("/read-all", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), NotificationController.markAllRead);

export const notificationRouter: Router = router;
