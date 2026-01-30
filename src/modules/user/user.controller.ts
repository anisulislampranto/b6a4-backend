import { Request, Response } from "express";
import { userService } from "./user.service";

const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json({
            data: users,
            message: 'Fetched All users!'
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to get all users", error: error });
    }
}

export const UserController = {
    getAllUsers,
}