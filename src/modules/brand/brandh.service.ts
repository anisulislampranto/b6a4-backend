import { Brand } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createBrand = async ({ data }: { data: Brand }) => {
    return prisma.brand.create({
        data: {
            name: data.name,
            description: data.description,
            logo: data.logo,
        },
    });
}


export const brandService = {
    createBrand
}