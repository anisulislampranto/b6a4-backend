import { NextFunction, Request, Response } from "express";
import { orderService } from "./order.service";
import { OrderStatus } from "../../../generated/prisma/client";

const isOrderStatus = (status: string): status is OrderStatus => {
    return Object.values(OrderStatus).includes(status as OrderStatus);
};

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        const order = await orderService.createOrder(userId, req.body);

        res.status(201).json({
            data: order,
            message: "Order placed successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        const result = await orderService.getMyOrders(userId, page, limit);

        res.status(200).json({
            data: result.data,
            meta: result.meta,
            message: "Orders fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const { id } = req.params;

        if (!userId || !role) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        const order = await orderService.getOrderById(id as string, userId, role);

        res.status(200).json({
            data: order,
            message: "Order fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await orderService.getAllOrders();

        res.status(200).json({
            data: orders,
            message: "All orders fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status } = req.body as { status: string };

        if (!isOrderStatus(status)) {
            return res.status(400).json({
                message: "Invalid order status.",
            });
        }

        const order = await orderService.updateOrderStatus(id as string, status);

        res.status(200).json({
            data: order,
            message: "Order status updated successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getSellerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sellerId = req.user?.id;

        if (!sellerId) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        const orders = await orderService.getSellerOrders(sellerId);

        res.status(200).json({
            data: orders,
            message: "Seller orders fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const updateSellerOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sellerId = req.user?.id;
        const { id } = req.params;
        const { status } = req.body as { status: string };

        if (!sellerId) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        if (!isOrderStatus(status)) {
            return res.status(400).json({
                message: "Invalid order status.",
            });
        }

        const order = await orderService.updateSellerOrderStatus(id as string, sellerId, status);

        res.status(200).json({
            data: order,
            message: "Order status updated successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { transactionId, session_id } = req.query;
        const tnxId = (transactionId || req.body?.tran_id) as string;
        const sessionId = (session_id || req.body?.session_id) as string;
        
        const result = await orderService.handlePaymentConfirmation(tnxId, sessionId);

        res.send(result);
    } catch (error) {
        next(error);
    }
};

export const OrderController = {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    getSellerOrders,
    updateSellerOrderStatus,
    verifyPayment,
};
