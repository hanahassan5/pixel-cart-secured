import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseName = process.env.DB_NAME || "gaming_store";

const run = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: databaseName,
        multipleStatements: true
    });

    try {
        const seedSql = await fs.readFile(path.join(__dirname, "../database/seeds/seed.sql"), "utf8");
        await connection.query(seedSql);
        console.log("Development seed data inserted successfully.");
    } catch (error) {
        console.error("Seed execution failed:", error.message);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
};

run().catch((error) => {
    console.error("Seed script failed:", error.message);
    process.exitCode = 1;
});
