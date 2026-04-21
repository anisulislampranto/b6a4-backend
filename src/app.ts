import express, { Application } from 'express'
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth';
import cors from 'cors'
import { categoryRouter } from './modules/category/category.routes';
import { brandRouter } from './modules/brand/brand.routes';
import { medicineRouter } from './modules/medicine/medicine.routes';
import { orderRouter } from './modules/order/order.routes';
import { userRouter } from './modules/user/user.routes';
import { reviewRouter } from './modules/review/review.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { notificationRouter } from './modules/notification/notification.routes';
import { notFound } from './middleware/notFound';
import errorHandler from './middleware/globalErrorHandler';

const app: Application = express();


const allowedOrigins = [
    process.env.APP_URL || "http://localhost:3000",
].filter(Boolean);


app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            // Check if origin is in allowedOrigins or matches Vercel preview pattern
            const isAllowed =
                allowedOrigins.includes(origin) ||
                /^https:\/\/next-blog-client.*\.vercel\.app$/.test(origin) ||
                /^https:\/\/.*\.vercel\.app$/.test(origin); // Any Vercel deployment
            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["Set-Cookie"],
    }),
);
// app.use(cors({
//     origin: process.env.APP_URL,
//     credentials: true
// }))

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello, world!")
})
app.use('/api/category', categoryRouter)
app.use('/api/brands', brandRouter)
app.use("/api/medicines", medicineRouter);
app.use("/api/orders", orderRouter);
app.use("/api/users", userRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notifications", notificationRouter);

app.use(notFound)
app.use(errorHandler)

export default app;
