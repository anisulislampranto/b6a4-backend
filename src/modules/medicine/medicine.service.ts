import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

interface MedicineQuery {
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
    limit?: string;
}


const getAllMedicines = async(query: MedicineQuery) => {
    const {
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        page = 1,
        limit = 12,
    } = query;

    const where: Prisma.MedicineWhereInput = {
        isActive: true,
    };

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }

    if (category) where.categoryId = category;
    if (brand) where.brandId = brand;

    if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = Number(minPrice);
        if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
        prisma.medicine.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
            include: { category: true, brand: true },
        }),
        prisma.medicine.count({ where }),
    ]);

    return {
        items,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
    };
}

export const medicineService = {
    getAllMedicines
}