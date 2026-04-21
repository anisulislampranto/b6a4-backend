import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    baseURL: process.env.APP_URL + "/api/auth",
    trustedOrigins: [
        process.env.APP_URL!
    ],
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },
    advanced: {
        cookiePrefix: "better-auth",
        useSecureCookies: process.env.NODE_ENV === "production",
        crossSubDomainCookies: {
            enabled: false,
        },
        disableCSRFCheck: true, // Allow requests without Origin header (Postman, mobile apps, etc.)
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: 'CUSTOMER',
                required: false
            },
        }
    },
    emailAndPassword: {
        enabled: true,
    },
});