import { prisma } from "../../lib/prisma";

export interface CreateOrderPayload {
    address: string;
    items: {
        medicineId: string;
        quantity: number;
    }[];
}

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
                throw new Error(`Medicine with ID ${item.medicineId} not found`);
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

const updateOrderStatus = async (orderId: string, status: any) => {
    return prisma.order.update({
        where: { id: orderId },
        data: { status },
    });
};

export const orderService = {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus
};
