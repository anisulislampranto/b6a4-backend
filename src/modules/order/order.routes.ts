import { Router } from "express";
import { OrderController } from "./order.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = Router();

router.post("/", auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SELLER), OrderController.createOrder);
router.get("/my", auth(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SELLER), OrderController.getMyOrders);
router.get("/seller", auth(UserRole.SELLER, UserRole.ADMIN), OrderController.getSellerOrders);
router.get("/all", auth(UserRole.ADMIN), OrderController.getAllOrders);
router.patch("/seller/:id", auth(UserRole.SELLER, UserRole.ADMIN), OrderController.updateSellerOrderStatus);
router.patch("/:id", auth(UserRole.ADMIN), OrderController.updateOrderStatus);

export const orderRouter: Router = router;
