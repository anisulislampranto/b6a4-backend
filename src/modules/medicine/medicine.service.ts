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

interface CreateMedicinePayload {
    name: string;
    description?: string;
    price: number | string;
    stock: number | string;
    image?: string;
    categoryId: string;
    brandId: string;
}

const createMedicine = async (payload: CreateMedicinePayload, sellerId: string) => {
    return prisma.medicine.create({
        data: {
            name: payload.name,
            description: payload.description || null,
            price: Number(payload.price),
            stock: Number(payload.stock),
            image: payload.image || null,
            categoryId: payload.categoryId,
            brandId: payload.brandId,
            sellerId,
        },
    });
};

const getMyMedicines = async (userId: string, role: string) => {
    const where: Prisma.MedicineWhereInput = role === "ADMIN"
        ? {}
        : { sellerId: userId };

    return prisma.medicine.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            category: true,
            brand: true,
        },
    });
};

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
    createMedicine,
    getAllMedicines,
    getMyMedicines,
}
