import { Brand } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createBrand = async ({ data }: { data: Brand }) => {
    return prisma.brand.create({
        data: {
            name: data.name,
            description: data.description,
            logo: data.logo || "",
        },
    });
}

const getBrands = async () => {
    return prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
    });
}

const deleteBrand = async (id: string) => {
    return prisma.brand.update({
        where: { id },
        data: { isActive: false },
    });
}

export const brandService = {
    createBrand,
    getBrands,
    deleteBrand
}