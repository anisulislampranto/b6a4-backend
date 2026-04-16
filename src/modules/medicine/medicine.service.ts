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

const getAllMedicines = async (query: MedicineQuery) => {
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

const getMedicineById = async (id: string) => {
    return prisma.medicine.findFirst({
        where: {
            id,
            isActive: true,
        },
        include: {
            category: true,
            brand: true,
        },
    });
};

const updateMedicine = async (id: string, payload: Partial<CreateMedicinePayload>, userId: string, role: string) => {
    const medicine = await prisma.medicine.findUnique({
        where: { id },
    });

    if (!medicine) {
        throw new Error("Medicine not found!");
    }

    if (role !== "ADMIN" && medicine.sellerId !== userId) {
        throw new Error("You are not authorized to update this medicine!");
    }

    return prisma.medicine.update({
        where: { id },
        data: {
            name: payload.name,
            description: payload.description,
            price: payload.price !== undefined ? Number(payload.price) : undefined,
            stock: payload.stock !== undefined ? Number(payload.stock) : undefined,
            image: payload.image,
            categoryId: payload.categoryId,
            brandId: payload.brandId,
        },
    });
};

const deleteMedicine = async (id: string, userId: string, role: string) => {
    const medicine = await prisma.medicine.findUnique({
        where: { id },
    });

    if (!medicine) {
        throw new Error("Medicine not found!");
    }

    if (role !== "ADMIN" && medicine.sellerId !== userId) {
        throw new Error("You are not authorized to delete this medicine!");
    }

    return prisma.medicine.update({
        where: { id },
        data: {
            isActive: false,
        },
    });
};

export const medicineService = {
    createMedicine,
    getAllMedicines,
    getMedicineById,
    getMyMedicines,
    updateMedicine,
    deleteMedicine,
}
