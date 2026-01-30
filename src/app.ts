import express, { Application } from 'express'
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth';
import cors from 'cors'
import { categoryRouter } from './modules/category/category.routes';
import { brandRouter } from './modules/brand/brand.routes';
import { medicineRouter } from './modules/medicine/medicine.routes';
import { userRouter } from './modules/user/user.routes';

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
app.use("/api/users", userRouter);

export default app;