import { NextFunction, Request, Response } from "express";
import { reviewService } from "./review.service";

const getMedicineReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { medicineId } = req.params;
        const reviews = await reviewService.getMedicineReviews(medicineId as string);

        res.status(200).json({
            data: reviews,
            message: "Reviews fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        const review = await reviewService.createReview(userId, req.body);
        res.status(201).json({
            data: review,
            message: "Review submitted successfully!",
        });
    } catch (error) {
        next(error);
    }
};

export const ReviewController = {
    getMedicineReviews,
    createReview,
};
