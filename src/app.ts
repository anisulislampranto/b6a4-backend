import express, { Application } from 'express'
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth';

const app: Application = express();

app.use(express.json());

app.all('/api/auth/*splat', toNodeHandler(auth));

app.get('/', (req, res) => {
    res.send("Hello, world!")
})

export default app;