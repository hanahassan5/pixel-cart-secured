import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { AppError } from "./middleware/appError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import router from "./modules/index.js";
import { testDatabaseConnection } from "./DB/DBConnection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


export const bootstrap = async () => {
    // CORS middleware to support local frontend preview servers (e.g. Live Server, Vite, etc.)
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Vary", "Origin");
        } else {
            res.setHeader("Access-Control-Allow-Origin", "*");
        }
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        );

        // Fast reply for CORS preflight requests
        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }
        next();
    });

    // Body parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Session management
    app.use(session({
        secret: process.env.SESSION_SECRET ?? "development-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            // Vulnerability: CSRF
            sameSite: false
        }
    }));

    // Template engine setup for invoices
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));

    // API router (mounted before static middleware to ensure /api routes are never intercepted)
    app.use("/api", router);

    // Static assets
    const uploadsDir = path.resolve(__dirname, "../uploads");
    app.use("/uploads", express.static(uploadsDir));
    app.use(express.static(uploadsDir));
    app.use(express.static(path.join(__dirname, "../../frontend")));

    // Frontend root route
    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../../frontend/index.html"));
    });

    // 404 handler for undefined routes
    app.use((req, res, next) => {
        next(new AppError(`Invalid URL: ${req.originalUrl}`, 404));
    });

    // Centralized global error handler
    app.use(errorHandler);

    // Database connection check before server startup
    try {
        await testDatabaseConnection();
        console.log("Database connection established successfully.");
    } catch (dbError) {
        console.warn("Database connection check warning:", dbError.message);
        console.warn("Ensure MySQL is running and credentials in .env are configured.");
    }

    // Server startup
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

export default app;
export { app };
