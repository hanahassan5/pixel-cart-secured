import dotenv from "dotenv";
dotenv.config();

import { bootstrap } from "./src/app.js";

bootstrap().catch((error) => {
    console.error("Application startup failed:", error);
    process.exitCode = 1;
});
