import { Router } from "express";
import { UserController } from "./user.controller";
import auth, { UserRole } from "../../middleware/auth";

const router = Router();

router.get("/", UserController.getAllUsers)
router.patch("/:id", UserController.updateUser)
router.get("/me", auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), UserController.getMe)

export const userRouter: Router = router;