import { OrderStatus } from "../../../generated/prisma/client";
import { AppError } from "../../lib/AppError";
import { prisma } from "../../lib/prisma";

interface CreateReviewPayload {
    medicineId: string;
    rating: number;
    comment?: string;
}

const getMedicineReviews = async (medicineId: string) => {
    return prisma.review.findMany({
        where: { medicineId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

const createReview = async (userId: string, payload: CreateReviewPayload) => {
    const { medicineId, rating, comment } = payload;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new AppError(400, "Rating must be an integer between 1 and 5.");
    }

    const medicine = await prisma.medicine.findFirst({
        where: { id: medicineId, isActive: true },
        select: { id: true },
    });

    if (!medicine) {
        throw new AppError(404, "Medicine not found.");
    }

    const deliveredPurchase = await prisma.orderItem.findFirst({
        where: {
            medicineId,
            order: {
                userId,
                status: OrderStatus.DELIVERED,
            },
        },
        select: { id: true },
    });

    if (!deliveredPurchase) {
        throw new AppError(403, "You can review only medicines from delivered orders.");
    }

    const existingReview = await prisma.review.findFirst({
        where: {
            userId,
            medicineId,
        },
        select: { id: true },
    });

    if (existingReview) {
        throw new AppError(409, "You have already reviewed this medicine.");
    }

    return prisma.review.create({
        data: {
            userId,
            medicineId,
            rating,
            comment: comment || null,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                },
            },
        },
    });
};

export const reviewService = {
    getMedicineReviews,
    createReview,
};
