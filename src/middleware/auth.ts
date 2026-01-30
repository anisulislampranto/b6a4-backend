import { NextFunction, Request, Response } from "express"
import { auth as betterAuth } from '../lib/auth'

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: string;
                emailVerified: boolean;
            }
        }
    }
}

export enum UserRole {
    CUSTOMER = "CUSTOMER",
    ADMIN = "ADMIN",
    SELLER = "SELLER"
}

const auth = (...roles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await betterAuth.api.getSession({
                headers: req.headers as any,
            })

            if (!session) {
                res.status(401).json({
                    message: 'You are not authorized!',
                    success: false
                })
            }

            req.user = {
                id: session?.user.id as string,
                email: session?.user.email as string,
                name: session?.user.name as string,
                role: session?.user.role as string,
                emailVerified: session?.user.emailVerified as boolean
            }

            if (roles.length && !roles.includes(req.user.role as UserRole)) {
                res.status(403).json({
                    message: 'Forbidden! you don not have permission to access this resources!',
                    success: false
                })
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

export default auth;