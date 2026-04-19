import http from "http";
import { Server } from "socket.io";
import { auth as betterAuth } from "./auth";

export interface SocketAuthedUser {
    id: string;
    role: string;
}

let io: Server | null = null;

const init = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.APP_URL,
            credentials: true,
        },
    });

    io.use(async (socket, next) => {
        try {
            const session = await betterAuth.api.getSession({
                headers: socket.handshake.headers as any,
            });

            if (!session?.user?.id) {
                next(new Error("UNAUTHORIZED"));
                return;
            }

            socket.data.user = {
                id: session.user.id as string,
                role: (session.user.role as string) || "CUSTOMER",
            } satisfies SocketAuthedUser;

            next();
        } catch (error) {
            next(error as Error);
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user as SocketAuthedUser | undefined;
        if (!user) return;

        socket.join(`user:${user.id}`);
        socket.join(`role:${user.role}`);

        socket.on("disconnect", () => {
        });
    });

    return io;
};

const getIO = () => io;

const emitToUser = (userId: string, event: string, payload: unknown) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
};

const emitToRole = (role: string, event: string, payload: unknown) => {
    if (!io) return;
    io.to(`role:${role}`).emit(event, payload);
};

export const socketService = {
    init,
    getIO,
    emitToUser,
    emitToRole,
};
