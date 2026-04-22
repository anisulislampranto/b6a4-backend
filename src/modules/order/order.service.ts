import { prisma } from "../../lib/prisma";
import { OrderStatus } from "../../../generated/prisma/client";
import { AppError } from "../../lib/AppError";
import { notificationService } from "../notification/notification.service";
import { emailService } from "../../lib/email";
import { createStripeSession, verifyStripePayment } from "./order.utils";

export interface CreateOrderPayload {
    address: string;
    paymentMethod: string;
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

const triggerPostOrderSideEffects = async (order: any) => {
    try {
        const orderWithSellerIds = await prisma.order.findUnique({
            where: { id: order.id },
            select: {
                id: true,
                items: {
                    select: {
                        medicine: {
                            select: {
                                sellerId: true,
                            },
                        },
                    },
                },
            },
        });

        const sellerIds = Array.from(
            new Set(orderWithSellerIds?.items.map(i => i.medicine.sellerId) || [])
        );

        await Promise.all(
            sellerIds.map((sellerId) =>
                notificationService.createNotification({
                    userId: sellerId,
                    type: "ORDER_PLACED",
                    title: "New order placed",
                    message: `Order #${order.id.slice(0, 8)} includes your products.`,
                    href: `/seller/orders`,
                    metadata: { orderId: order.id },
                })
            )
        );

    } catch (err) {
        console.error("Post-order side effects failed:", err);
    }
};

const createOrder = async (userId: string, payload: CreateOrderPayload) => {
    const { address, items, paymentMethod } = payload;

    const order = (await prisma.$transaction(
        async (tx) => {
            const medicineIds = items.map((i) => i.medicineId);

            const medicines = await tx.medicine.findMany({
                where: { id: { in: medicineIds } },
                select: {
                    id: true,
                    price: true,
                    stock: true,
                    name: true,
                },
            });

            const medicineMap = Object.fromEntries(medicines.map((m) => [m.id, m]));

            const { totalAmount, orderItemsData, stockUpdates } = items.reduce(
                (acc, item) => {
                    const medicine = medicineMap[item.medicineId];

                    if (!medicine) {
                        throw new AppError(404, `Medicine not found`);
                    }

                    if (medicine.stock < item.quantity) {
                        throw new AppError(400, `Insufficient stock for ${medicine.name}`);
                    }

                    acc.totalAmount += medicine.price * item.quantity;

                    acc.orderItemsData.push({
                        medicineId: item.medicineId,
                        quantity: item.quantity,
                        price: medicine.price,
                    });

                    acc.stockUpdates.push({
                        id: item.medicineId,
                        quantity: item.quantity,
                    });

                    return acc;
                },
                {
                    totalAmount: 0,
                    orderItemsData: [] as any[],
                    stockUpdates: [] as { id: string; quantity: number }[],
                }
            );

            // Don't update stock for COD yet if you want to wait for confirmation, 
            // but usually we decrement and then increment back if cancelled.
            // For online payment, we definitely decrement now or after payment.
            // Let's stick to current logic of decrementing on order placement.
            const updateResults = await Promise.all(
                stockUpdates.map((u) =>
                    tx.medicine.updateMany({
                        where: {
                            id: u.id,
                            stock: { gte: u.quantity },
                        },
                        data: {
                            stock: { decrement: u.quantity },
                        },
                    })
                )
            );

            if (updateResults.some((r) => r.count === 0)) {
                throw new AppError(400, "Some items are out of stock");
            }

            const transactionId = `TXN-${Date.now()}`;

            const newOrder = await tx.order.create({
                data: {
                    userId,
                    address,
                    totalAmount,
                    paymentMethod,
                    transactionId,
                    items: {
                        create: orderItemsData,
                    },
                },
                include: { user: true, items: true },
            });

            return newOrder;
        },
        {
            maxWait: 5000, // default: 2000
            timeout: 10000, // default: 5000
        }
    )) as any;

    if (paymentMethod === "STRIPE") {
        const session = await createStripeSession({
            transactionId: order.transactionId,
            totalPrice: order.totalAmount,
            customerName: order.user.name,
            customerEmail: order.user.email,
        });

        if (!session.url) {
            throw new AppError(400, "Stripe session creation failed");
        }

        return {
            payment_url: session.url,
        };
    }

    await triggerPostOrderSideEffects(order);

    return order;
};

const handlePaymentConfirmation = async (transactionId: string, sessionId: string) => {
    const session = await verifyStripePayment(sessionId);

    let message = "";
    if (session && (session.payment_status === "paid" || session.status === "complete")) {
        await prisma.order.update({
            where: { transactionId },
            data: {
                paymentStatus: "PAID",
            },
        });
        message = "Successfully Paid!";
    } else {
        message = "Payment Failed!";
    }

    return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0fdf4; }
          .card { background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #059669; }
          a { display: inline-block; margin-top: 1rem; padding: 0.5rem 1rem; background: #059669; color: white; text-decoration: none; border-radius: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${message}</h1>
          <a href="${process.env.APP_URL}/orders">Go to Orders</a>
        </div>
      </body>
    </html>
    `;
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

    // Email: order confirmed (admin path)
    if (existingOrder.status !== status && status === OrderStatus.CONFIRMED) {
        try {
            const orderDetails = await prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    address: true,
                    totalAmount: true,
                    user: { select: { email: true, name: true } },
                    items: {
                        select: {
                            quantity: true,
                            price: true,
                            medicine: { select: { name: true } },
                        },
                    },
                },
            });

            if (orderDetails?.user?.email) {
                await emailService.sendOrderConfirmedEmail({
                    to: orderDetails.user.email,
                    customerName: orderDetails.user.name,
                    orderId: orderDetails.id,
                    address: orderDetails.address,
                    totalAmount: orderDetails.totalAmount,
                    items: orderDetails.items.map((item) => ({
                        name: item.medicine.name,
                        quantity: item.quantity,
                        unitPrice: item.price,
                    })),
                });
            }
        } catch {
            // no-op
        }
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

    // Email: order confirmed (seller path)
    if (order.status !== status && status === OrderStatus.CONFIRMED) {
        try {
            const orderDetails = await prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    address: true,
                    totalAmount: true,
                    user: { select: { email: true, name: true } },
                    items: {
                        select: {
                            quantity: true,
                            price: true,
                            medicine: { select: { name: true } },
                        },
                    },
                },
            });

            if (orderDetails?.user?.email) {
                await emailService.sendOrderConfirmedEmail({
                    to: orderDetails.user.email,
                    customerName: orderDetails.user.name,
                    orderId: orderDetails.id,
                    address: orderDetails.address,
                    totalAmount: orderDetails.totalAmount,
                    items: orderDetails.items.map((item) => ({
                        name: item.medicine.name,
                        quantity: item.quantity,
                        unitPrice: item.price,
                    })),
                });
            }
        } catch {
            // no-op
        }
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
    handlePaymentConfirmation,
};
