import { OrderStatus, Role } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type DateRangeKey = "7d" | "30d" | "90d";
type DashboardDateQuery = {
    range?: string;
    startDate?: string;
    endDate?: string;
};

const rangeDaysMap: Record<DateRangeKey, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
};

const resolveDateRange = (query?: DashboardDateQuery) => {
    const parsedStart = query?.startDate ? new Date(query.startDate) : null;
    const parsedEnd = query?.endDate ? new Date(query.endDate) : null;
    const hasValidCustomRange =
        parsedStart &&
        parsedEnd &&
        !Number.isNaN(parsedStart.getTime()) &&
        !Number.isNaN(parsedEnd.getTime());

    if (hasValidCustomRange) {
        parsedEnd.setHours(23, 59, 59, 999);
        return { key: "custom", startDate: parsedStart, endDate: parsedEnd };
    }

    const normalized = (query?.range || "30d") as DateRangeKey;
    const days = rangeDaysMap[normalized] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { key: normalized, startDate, endDate: new Date() };
};

const toDayKey = (date: Date) => date.toISOString().slice(0, 10);
const toMonthKey = (date: Date) => date.toISOString().slice(0, 7);
const activeOrderStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED];

const getCustomerDashboardStats = async (userId: string, query?: DashboardDateQuery) => {
    const { key, startDate, endDate } = resolveDateRange(query);

    const orders = await prisma.order.findMany({
        where: {
            userId,
            createdAt: { gte: startDate, lte: endDate },
        },
        include: {
            items: {
                include: {
                    medicine: {
                        select: {
                            id: true,
                            name: true,
                            category: { select: { id: true, name: true } },
                            brand: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const activeOrders = orders.filter((order) => activeOrderStatuses.includes(order.status)).length;
    const deliveredOrders = orders.filter((order) => order.status === OrderStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((order) => order.status === OrderStatus.CANCELLED).length;

    const monthlySpendMap = new Map<string, number>();
    orders.forEach((order) => {
        const month = toMonthKey(order.createdAt);
        monthlySpendMap.set(month, (monthlySpendMap.get(month) || 0) + order.totalAmount);
    });

    const deliveredItems = orders
        .filter((order) => order.status === OrderStatus.DELIVERED)
        .flatMap((order) => order.items);

    const categoryMap = new Map<string, { label: string; value: number }>();
    const brandMap = new Map<string, { label: string; value: number }>();

    deliveredItems.forEach((item) => {
        const categoryId = item.medicine.category.id;
        const brandId = item.medicine.brand.id;
        const categoryCurrent = categoryMap.get(categoryId) || { label: item.medicine.category.name, value: 0 };
        const brandCurrent = brandMap.get(brandId) || { label: item.medicine.brand.name, value: 0 };
        categoryMap.set(categoryId, { ...categoryCurrent, value: categoryCurrent.value + item.quantity });
        brandMap.set(brandId, { ...brandCurrent, value: brandCurrent.value + item.quantity });
    });

    const deliveredMedicineIds = Array.from(new Set(deliveredItems.map((item) => item.medicineId)));
    const reviewedCount = deliveredMedicineIds.length
        ? await prisma.review.count({
            where: {
                userId,
                medicineId: { in: deliveredMedicineIds },
            },
        })
        : 0;
    const eligibleReviewCount = deliveredMedicineIds.length;
    const reviewCompletionRate = eligibleReviewCount
        ? Math.round((reviewedCount / eligibleReviewCount) * 100)
        : 0;

    return {
        role: "CUSTOMER",
        range: key,
        summary: {
            totalOrders,
            totalSpent,
            activeOrders,
            deliveredOrders,
            cancelledOrders,
            eligibleReviewCount,
            reviewedCount,
            reviewCompletionRate,
        },
        trends: {
            monthlySpend: Array.from(monthlySpendMap.entries())
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        },
        distributions: {
            topCategories: Array.from(categoryMap.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 5),
            topBrands: Array.from(brandMap.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 5),
        },
        recentOrders: orders.slice(0, 5).map((order) => ({
            id: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
        })),
    };
};

const getSellerDashboardStats = async (sellerId: string, query?: DashboardDateQuery) => {
    const { key, startDate, endDate } = resolveDateRange(query);

    const medicines = await prisma.medicine.findMany({
        where: { sellerId },
        select: {
            id: true,
            name: true,
            stock: true,
            isActive: true,
        },
    });

    const sellerOrders = await prisma.order.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            items: {
                some: {
                    medicine: { sellerId },
                },
            },
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
            items: {
                where: {
                    medicine: { sellerId },
                },
                include: {
                    medicine: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const deliveredItems = sellerOrders
        .filter((order) => order.status === OrderStatus.DELIVERED)
        .flatMap((order) => order.items.map((item) => ({ ...item, orderCreatedAt: order.createdAt })));

    const totalUnitsSold = deliveredItems.reduce((sum, item) => sum + item.quantity, 0);
    const grossRevenue = deliveredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const revenueTrendMap = new Map<string, number>();
    const topMedicineMap = new Map<string, { label: string; unitsSold: number; revenue: number }>();

    deliveredItems.forEach((item) => {
        const day = toDayKey(item.orderCreatedAt);
        revenueTrendMap.set(day, (revenueTrendMap.get(day) || 0) + item.price * item.quantity);

        const medicineCurrent = topMedicineMap.get(item.medicineId) || {
            label: item.medicine?.name || "Medicine",
            unitsSold: 0,
            revenue: 0,
        };
        topMedicineMap.set(item.medicineId, {
            label: medicineCurrent.label,
            unitsSold: medicineCurrent.unitsSold + item.quantity,
            revenue: medicineCurrent.revenue + item.price * item.quantity,
        });
    });

    const orderStatusDistribution = Object.values(OrderStatus).reduce<Record<OrderStatus, number>>((acc, status) => {
        acc[status] = sellerOrders.filter((order) => order.status === status).length;
        return acc;
    }, {
        PENDING: 0,
        CONFIRMED: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
    });

    return {
        role: "SELLER",
        range: key,
        summary: {
            totalMedicines: medicines.length,
            activeMedicines: medicines.filter((m) => m.isActive).length,
            inactiveMedicines: medicines.filter((m) => !m.isActive).length,
            lowStockMedicines: medicines.filter((m) => m.stock < 10 && m.isActive).length,
            totalUnitsSold,
            grossRevenue,
            totalOrders: sellerOrders.length,
        },
        trends: {
            revenueByDay: Array.from(revenueTrendMap.entries())
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        },
        distributions: {
            orderStatus: Object.entries(orderStatusDistribution).map(([label, value]) => ({ label, value })),
            topMedicines: Array.from(topMedicineMap.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5),
            funnel: [
                { label: "CONFIRMED", value: orderStatusDistribution.CONFIRMED },
                { label: "SHIPPED", value: orderStatusDistribution.SHIPPED },
                { label: "DELIVERED", value: orderStatusDistribution.DELIVERED },
            ],
        },
        recentOrders: sellerOrders.slice(0, 5).map((order) => ({
            id: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            customerName: order.user?.name || "Unknown",
            customerEmail: order.user?.email || "",
        })),
    };
};

const getAdminDashboardStats = async (query?: DashboardDateQuery) => {
    const { key, startDate, endDate } = resolveDateRange(query);

    const [users, medicines, reviews, orders] = await Promise.all([
        prisma.user.findMany({
            select: { id: true, role: true, createdAt: true, name: true, email: true },
        }),
        prisma.medicine.findMany({
            select: { id: true, sellerId: true, isActive: true, name: true, createdAt: true },
        }),
        prisma.review.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { id: true, rating: true, createdAt: true },
        }),
        prisma.order.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: {
                items: {
                    include: {
                        medicine: {
                            include: {
                                category: { select: { id: true, name: true } },
                                brand: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const gmvDelivered = orders
        .filter((order) => order.status === OrderStatus.DELIVERED)
        .reduce((sum, order) => sum + order.totalAmount, 0);

    const ordersByStatus = Object.values(OrderStatus).map((status) => ({
        label: status,
        value: orders.filter((order) => order.status === status).length,
    }));

    const usersByRole = Object.values(Role).map((role) => ({
        label: role,
        value: users.filter((user) => user.role === role).length,
    }));

    const newUsersTrendMap = new Map<string, number>();
    users
        .filter((user) => user.createdAt >= startDate)
        .forEach((user) => {
            const day = toDayKey(user.createdAt);
            newUsersTrendMap.set(day, (newUsersTrendMap.get(day) || 0) + 1);
        });

    const deliveredItems = orders
        .filter((order) => order.status === OrderStatus.DELIVERED)
        .flatMap((order) => order.items);

    const categoryMap = new Map<string, { label: string; unitsSold: number; revenue: number }>();
    const brandMap = new Map<string, { label: string; unitsSold: number; revenue: number }>();

    deliveredItems.forEach((item) => {
        const categoryId = item.medicine.category.id;
        const brandId = item.medicine.brand.id;
        const categoryCurrent = categoryMap.get(categoryId) || { label: item.medicine.category.name, unitsSold: 0, revenue: 0 };
        const brandCurrent = brandMap.get(brandId) || { label: item.medicine.brand.name, unitsSold: 0, revenue: 0 };

        categoryMap.set(categoryId, {
            label: categoryCurrent.label,
            unitsSold: categoryCurrent.unitsSold + item.quantity,
            revenue: categoryCurrent.revenue + item.price * item.quantity,
        });
        brandMap.set(brandId, {
            label: brandCurrent.label,
            unitsSold: brandCurrent.unitsSold + item.quantity,
            revenue: brandCurrent.revenue + item.price * item.quantity,
        });
    });

    const reviewVolume = reviews.length;
    const averageRating = reviewVolume
        ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewVolume).toFixed(2))
        : 0;

    const activeSellers = new Set(
        medicines.filter((medicine) => medicine.isActive).map((medicine) => medicine.sellerId)
    ).size;

    const recentEvents = [
        ...users
            .slice()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 3)
            .map((user) => ({
                type: "NEW_USER",
                timestamp: user.createdAt,
                message: `New ${user.role.toLowerCase()} registered: ${user.name || user.email}`,
            })),
        ...medicines
            .slice()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 3)
            .map((medicine) => ({
                type: "NEW_MEDICINE",
                timestamp: medicine.createdAt,
                message: `New medicine added: ${medicine.name}`,
            })),
        ...orders
            .slice(0, 4)
            .map((order) => ({
                type: order.status === OrderStatus.CANCELLED ? "CANCELLED_ORDER" : "NEW_ORDER",
                timestamp: order.createdAt,
                message: `Order ${order.id.slice(0, 8)} is ${order.status.toLowerCase()}`,
            })),
    ]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 8)
        .map((event) => ({
            ...event,
            timestamp: event.timestamp.toISOString(),
        }));

    return {
        role: "ADMIN",
        range: key,
        summary: {
            gmvDelivered,
            totalOrders: orders.length,
            totalUsers: users.length,
            totalSellers: users.filter((user) => user.role === Role.SELLER).length,
            activeSellers,
            totalMedicines: medicines.length,
            activeMedicines: medicines.filter((medicine) => medicine.isActive).length,
            reviewVolume,
            averageRating,
        },
        trends: {
            newUsersByDay: Array.from(newUsersTrendMap.entries())
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        },
        distributions: {
            ordersByStatus,
            usersByRole,
            categoryPerformance: Array.from(categoryMap.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 8),
            brandPerformance: Array.from(brandMap.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 8),
        },
        recentEvents,
    };
};

export const dashboardService = {
    getCustomerDashboardStats,
    getSellerDashboardStats,
    getAdminDashboardStats,
};
