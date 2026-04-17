import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";

const getDateQuery = (req: Request) => ({
    range: req.query.range as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
});

const getCustomerDashboard = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "You are not authorized", data: null });
            return;
        }

        const stats = await dashboardService.getCustomerDashboardStats(req.user.id, getDateQuery(req));

        res.json({
            data: stats,
            message: "Fetched customer dashboard stats",
        });
    } catch (error) {
        res.status(400).json({
            data: null,
            message: "Failed to fetch customer dashboard stats",
            error,
        });
    }
};

const getSellerDashboard = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "You are not authorized", data: null });
            return;
        }

        const stats = await dashboardService.getSellerDashboardStats(req.user.id, getDateQuery(req));

        res.json({
            data: stats,
            message: "Fetched seller dashboard stats",
        });
    } catch (error) {
        res.status(400).json({
            data: null,
            message: "Failed to fetch seller dashboard stats",
            error,
        });
    }
};

const getAdminDashboard = async (req: Request, res: Response) => {
    try {
        const stats = await dashboardService.getAdminDashboardStats(getDateQuery(req));

        res.json({
            data: stats,
            message: "Fetched admin dashboard stats",
        });
    } catch (error) {
        res.status(400).json({
            data: null,
            message: "Failed to fetch admin dashboard stats",
            error,
        });
    }
};

export const DashboardController = {
    getCustomerDashboard,
    getSellerDashboard,
    getAdminDashboard,
};
