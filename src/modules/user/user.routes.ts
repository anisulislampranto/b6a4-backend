import { Router } from "express";
import { UserController } from "./user.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = Router();

router.get("/", auth(UserRole.ADMIN), UserController.getAllUsers)
router.get("/me", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), UserController.getMe)
router.patch("/me", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), UserController.updateMe)
router.patch("/:id", auth(UserRole.ADMIN), UserController.updateUser)

export const userRouter: Router = router;