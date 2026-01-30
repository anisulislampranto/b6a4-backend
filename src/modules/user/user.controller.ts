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

const updateUser = async (req: Request, res: Response) => {
    try {
        const users = await userService.updateUser({ id: req.params.id as string, data: req.body });
        res.json({
            data: users,
            message: 'User Updated Successfully!'
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to update user", error: error });
    }
}

const getMe = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.json(({
                data: null,
                message: 'You are not allowed to perform this action'
            }))
            return
        }
        const id = req.user.id as string;
        const user = await userService.getMe(id);
        res.json({
            data: user,
            message: 'Fetched signed in user information Successfully!'
        });
    } catch (error) {
        res.status(400).json({ message: "Failed to fetch user", error: error });
    }
}

export const UserController = {
    getAllUsers,
    updateUser,
    getMe
}