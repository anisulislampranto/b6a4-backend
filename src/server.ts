import app from "./app";
import { prisma } from "./lib/prisma";
import http from "http";
import { socketService } from "./lib/socket";

const port = process.env.PORT

async function main() {
    try {
        await prisma.$connect()
        console.log('Connected to Database Successfully!');

        const server = http.createServer(app);
        socketService.init(server);

        server.listen(port, () => {
            console.log('Server is running on port', port);
        });
    } catch (error) {
        console.error(error);
        await prisma.$disconnect()
        process.exit(1)
    }
}

main();
