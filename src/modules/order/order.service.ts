import { prisma } from "../../lib/prisma";
import { OrderStatus } from "../../../generated/prisma/client";
import { AppError } from "../../lib/AppError";
import { notificationService } from "../notification/notification.service";

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

    const order = await prisma.$transaction(async (tx) => {
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


        return order;
    });

    // Notify relevant sellers (and admins) after order creation.
    try {
        const orderWithSellerIds = await prisma.order.findUnique({
            where: { id: order.id },
            select: {
                id: true,
                userId: true,
                items: {
                    select: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                sellerId: true,
                            },
                        },
                    },
                },
            },
        });

        const sellerIds = Array.from(
            new Set(orderWithSellerIds?.items.map((item) => item.medicine.sellerId) || [])
        );

        await Promise.all(
            sellerIds.map((sellerId) =>
                notificationService.createNotification({
                    userId: sellerId,
                    type: "ORDER_PLACED",
                    title: "New order placed",
                    message: `A customer placed an order containing your medicines (order #${order.id.slice(0, 8)}).`,
                    href: `/seller/orders`,
                    metadata: { orderId: order.id },
                })
            )
        );
    } catch {
        // Don't fail order creation if notification fails.
    }

    return order;
};

const getMyOrders = async (userId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
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
            skip,
            take: limit,
        }),
        prisma.order.count({
            where: { userId },
        }),
    ]);

    return {
        data: orders,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
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

const getOrderById = async (orderId: string, userId: string, role: string) => {
    if (role === "ADMIN") {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
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
        });

        if (!order) {
            throw new AppError(404, "Order not found");
        }

        return order;
    }

    if (role === "SELLER") {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                items: {
                    some: {
                        medicine: {
                            sellerId: userId,
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
                            sellerId: userId,
                        },
                    },
                    include: {
                        medicine: true,
                    },
                },
            },
        });

        if (!order) {
            throw new AppError(404, "Order not found");
        }

        return order;
    }

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId,
        },
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
    });

    if (!order) {
        throw new AppError(404, "Order not found");
    }

    return order;
};

const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, userId: true },
    });

    if (!existingOrder) {
        throw new AppError(404, "Order not found");
    }

    validateOrderStatusTransition(existingOrder.status, status);

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
    });

    try {
        await notificationService.createNotification({
            userId: existingOrder.userId,
            type: "ORDER_STATUS_UPDATED",
            title: "Order status updated",
            message: `Your order #${orderId.slice(0, 8)} status changed to ${status}.`,
            href: `/orders/${orderId}`,
            metadata: { orderId, status },
        });
    } catch {
    }

    return updated;
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
            userId: true,
        },
    });

    if (!order) {
        throw new AppError(404, "Order not found for this seller");
    }

    validateOrderStatusTransition(order.status, status);

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
    });

    try {
        await notificationService.createNotification({
            userId: order.userId,
            type: "ORDER_STATUS_UPDATED",
            title: "Order status updated",
            message: `Your order #${orderId.slice(0, 8)} status changed to ${status}.`,
            href: `/orders/${orderId}`,
            metadata: { orderId, status, sellerId },
        });
    } catch {
    }

    return updated;
};

export const orderService = {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,
    getSellerOrders,
    updateOrderStatus,
    updateSellerOrderStatus,
};
