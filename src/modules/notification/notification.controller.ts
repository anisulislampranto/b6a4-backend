import { NextFunction, Request, Response } from "express";
import { notificationService } from "./notification.service";

const listMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const rawLimit = req.query.limit;
        const limitValue = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
        const limit = parseInt(limitValue ? String(limitValue) : "30", 10);

        const result = await notificationService.listMyNotifications(userId, limit);

        res.json({
            data: result,
            message: "Notifications fetched successfully",
        });
    } catch (error) {
        next(error);
    }
};

const markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const id = String((req.params as any).id);
        const updated = await notificationService.markRead(userId, id);

        res.json({
            data: updated,
            message: updated ? "Notification marked as read" : "Notification not found",
        });
    } catch (error) {
        next(error);
    }
};

const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const result = await notificationService.markAllRead(userId);

        res.json({
            data: result,
            message: "Notifications marked as read",
        });
    } catch (error) {
        next(error);
    }
};

export const NotificationController = {
    listMyNotifications,
    markRead,
    markAllRead,
};
