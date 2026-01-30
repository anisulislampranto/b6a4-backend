import { prisma } from "../../lib/prisma"


const getAllUsers = async () => {
    return await prisma.user.findMany()
}

export const userService = {
    getAllUsers
}