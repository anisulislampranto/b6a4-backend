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

const getMe = async (id: string) => {
    return prisma.user.findUnique({
        where: {
            id
        }
    })
};

export const userService = {
    getAllUsers,
    updateUser,
    getMe
}