import { prisma } from "../../lib/prisma";
import { socketService } from "../../lib/socket";
import type { Prisma } from "../../../generated/prisma/client";

export interface CreateNotificationPayload {
    userId: string;
    type: string;
    title: string;
    message: string;
    href?: string;
    metadata?: Prisma.InputJsonValue;
}

const createNotification = async (payload: CreateNotificationPayload) => {
    const created = await prisma.notification.create({
        data: {
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            href: payload.href,
            metadata: payload.metadata,
        },
    });

    socketService.emitToUser(payload.userId, "notification:new", created);

    return created;
};

const listMyNotifications = async (userId: string, limit = 30) => {
    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 100),
    });

    const unreadCount = await prisma.notification.count({
        where: { userId, readAt: null },
    });

    return { notifications, unreadCount };
};

const markRead = async (userId: string, notificationId: string) => {
    const existing = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
        select: { id: true, readAt: true },
    });

    if (!existing) return null;
    if (existing.readAt) return existing;

    return prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
        select: { id: true, readAt: true },
    });
};

const markAllRead = async (userId: string) => {
    await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
    });

    socketService.emitToUser(userId, "notification:read-all", { ok: true });

    return { ok: true } as const;
};

export const notificationService = {
    createNotification,
    listMyNotifications,
    markRead,
    markAllRead,
};
