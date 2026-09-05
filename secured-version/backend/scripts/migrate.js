import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseName = process.env.DB_NAME || "gaming_store";
const connectionOptions = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
};

const run = async () => {
    const serverConnection = await mysql.createConnection(connectionOptions);
    await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    await serverConnection.end();

    const connection = await mysql.createConnection({ ...connectionOptions, database: databaseName });
    const migrationDirectory = path.join(__dirname, "../database/migrations");
    const files = (await fs.readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
        const sql = await fs.readFile(path.join(migrationDirectory, file), "utf8");
        await connection.query(sql);
        console.log(`Applied migration: ${file}`);
    }

    await connection.end();
    console.log("All migrations applied successfully.");
};

run().catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
});
