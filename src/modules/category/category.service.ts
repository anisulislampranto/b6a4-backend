import { Category } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createCategory = async (data: Category) => {
    return prisma.category.create({
        data: {
            name: data.name,
            description: data.description,
            parentId: data.parentId || null,
        },
    });
}

const getAllCategories = async () => {
    return prisma.category.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
    });
}


export const categoryService = {
    createCategory,
    getAllCategories
}