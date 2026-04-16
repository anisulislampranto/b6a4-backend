import { Request, Response } from "express";
import { orderService } from "./order.service";
import { OrderStatus } from "../../../generated/prisma/client";

const createOrder = async (req: Request, res: Response) => {
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
};

const getMyOrders = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({
            message: "User not authenticated",
        });
    }

    const orders = await orderService.getMyOrders(userId);

    res.status(200).json({
        data: orders,
        message: "Orders fetched successfully!",
    });
};

const getAllOrders = async (req: Request, res: Response) => {
    const orders = await orderService.getAllOrders();

    res.status(200).json({
        data: orders,
        message: "All orders fetched successfully!",
    });
};

const updateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: OrderStatus };

    const order = await orderService.updateOrderStatus(id as string, status);

    res.status(200).json({
        data: order,
        message: "Order status updated successfully!",
    });
};

const getSellerOrders = async (req: Request, res: Response) => {
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
};

const updateSellerOrderStatus = async (req: Request, res: Response) => {
    const sellerId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body as { status: OrderStatus };

    if (!sellerId) {
        return res.status(401).json({
            message: "User not authenticated",
        });
    }

    const order = await orderService.updateSellerOrderStatus(id as string, sellerId, status);

    res.status(200).json({
        data: order,
        message: "Order status updated successfully!",
    });
};

export const OrderController = {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    getSellerOrders,
    updateSellerOrderStatus,
};
