import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();

router.get("/", UserController.getAllUsers)
router.patch("/:id", UserController.updateUser)

export const userRouter: Router = router;