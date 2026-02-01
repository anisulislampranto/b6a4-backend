import { prisma } from "../lib/prisma";
import { UserRole } from "../middleware/auth";

async function seedAdmin() {
    try {
        const adminData = {
            email: "admin@skillbridge.com",
            name: 'Admin Myself',
            role: UserRole.ADMIN,
            password: 'admin123'
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email: adminData.email
            }
        })

        if (existingUser) {
            throw new Error("User already exists!")
        }

        const signUpAdmin = await fetch('http://localhost:5000/api/auth/sign-up/email', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost:3000",
            },
            body: JSON.stringify(adminData)
        })

        console.log('signUpAdmin', signUpAdmin);

        if (signUpAdmin.ok) {
            await prisma.user.update({
                where: {
                    email: adminData.email
                },
                data: {
                    emailVerified: true
                }
            })
        }

    } catch (error) {
        console.log(error);
    }
}

seedAdmin()