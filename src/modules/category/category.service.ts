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


export const categoryService = {
    createCategory,
}