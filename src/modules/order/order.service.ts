import { prisma } from "../../lib/prisma";
import { OrderStatus } from "../../../generated/prisma/client";
import { AppError } from "../../lib/AppError";

export interface CreateOrderPayload {
    address: string;
    items: {
        medicineId: string;
        quantity: number;
    }[];
}

const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
};

const validateOrderStatusTransition = (currentStatus: OrderStatus, nextStatus: OrderStatus) => {
    if (currentStatus === nextStatus) return;

    const allowedNext = orderStatusTransitions[currentStatus];
    if (!allowedNext.includes(nextStatus)) {
        throw new AppError(
            400,
            `Invalid status transition from ${currentStatus} to ${nextStatus}`
        );
    }
};

const createOrder = async (userId: string, payload: CreateOrderPayload) => {
    const { address, items } = payload;

    return await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {

            const medicine = await tx.medicine.findUnique({
                where: { id: item.medicineId },
            });


            if (!medicine) {
                throw new AppError(404, `Medicine with ID ${item.medicineId} not found`);
            }

            if (medicine.stock < item.quantity) {
                console.log("medicine", medicine)
            }


            const itemPrice = medicine.price * item.quantity;
            totalAmount += itemPrice;

            orderItemsData.push({
                medicineId: item.medicineId,
                quantity: item.quantity,
                price: medicine.price, // Store historical price at time of purchase
            });


            // Update Stock
            await tx.medicine.update({
                where: { id: item.medicineId },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });
        }

        // Create the Order
        const order = await tx.order.create({
            data: {
                userId,
                address,
                totalAmount,
                items: {
                    create: orderItemsData,
                },
            },
            include: {
                items: true,
            },
        });

        console.log("order", order)

        return order;
    });
};

const getMyOrders = async (userId: string) => {
    return prisma.order.findMany({
        where: { userId },
        include: {
            items: {
                include: {
                    medicine: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const getAllOrders = async () => {
    return prisma.order.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            items: {
                include: {
                    medicine: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const getSellerOrders = async (sellerId: string) => {
    return prisma.order.findMany({
        where: {
            items: {
                some: {
                    medicine: {
                        sellerId,
                    },
                },
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            items: {
                where: {
                    medicine: {
                        sellerId,
                    },
                },
                include: {
                    medicine: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
    });

    if (!existingOrder) {
        throw new AppError(404, "Order not found");
    }

    validateOrderStatusTransition(existingOrder.status, status);

    return prisma.order.update({
        where: { id: orderId },
        data: { status },
    });
};

const updateSellerOrderStatus = async (orderId: string, sellerId: string, status: OrderStatus) => {
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            items: {
                some: {
                    medicine: {
                        sellerId,
                    },
                },
            },
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!order) {
        throw new AppError(404, "Order not found for this seller");
    }

    validateOrderStatusTransition(order.status, status);

    return prisma.order.update({
        where: { id: orderId },
        data: { status },
    });
};

export const orderService = {
    createOrder,
    getMyOrders,
    getAllOrders,
    getSellerOrders,
    updateOrderStatus,
    updateSellerOrderStatus,
};
