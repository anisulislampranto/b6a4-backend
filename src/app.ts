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
import { notFound } from './middleware/notFound';
import errorHandler from './middleware/globalErrorHandler';

const app: Application = express();

app.use(cors({
    origin: process.env.APP_URL,
    credentials: true
}))

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

app.use(notFound)
app.use(errorHandler)

export default app;
