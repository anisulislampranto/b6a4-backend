import { User } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma"


const getAllUsers = async () => {
    return await prisma.user.findMany()
}

const updateUser = async ({ id, data }: { id: string, data: User }) => {
    return prisma.user.update({
        where: { id },
        data,
    });
};

export const userService = {
    getAllUsers,
    updateUser
}