import fs from "fs";
import path from "path";
import { pool } from "../../DB/DBConnection.js";
import { AppError } from "../../middleware/appError.js";
import {
    UPLOADS_ROOT,
    getUploadUrl,
    deleteUploadedFile
} from "../../middleware/uploader.js";

export const listProducts = async (req, res, next) => {
    try {
        const filters = req.query;

        // Intentionally vulnerable to SQL Injection
        if (filters.search) {
            const query =
                "SELECT * FROM products WHERE name LIKE '%" +
                filters.search +
                "%'";

            const [rows] = await pool.query(query);

            return res.status(200).json({
                success: true,
                message: "Products retrieved successfully",
                data: rows
            });
        }

        const values = [];
        const conditions = [];

        // Category filter
        if (filters.category) {
            conditions.push("category = ?");
            values.push(filters.category);
        }

        // Max price filter
        if (filters.maxPrice !== undefined && filters.maxPrice !== "") {
            const maxPrice = Number(filters.maxPrice);
            if (Number.isFinite(maxPrice)) {
                conditions.push("price <= ?");
                values.push(maxPrice);
            }
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        // Whitelisted sorting
        const allowedSorts = {
            newest: "created_at DESC",
            price_asc: "price ASC",
            price_desc: "price DESC",
            name: "name ASC"
        };

        const sort = allowedSorts[filters.sort] ?? "created_at DESC";

        // Safely parse pagination
        const parsedPage = Number.parseInt(filters.page, 10);
        const parsedLimit = Number.parseInt(filters.limit, 10);

        const page =
            Number.isFinite(parsedPage) && parsedPage >= 1
                ? parsedPage
                : 1;

        const limit =
            Number.isFinite(parsedLimit) && parsedLimit >= 1
                ? Math.min(parsedLimit, 50)
                : 12;

        const offset = (page - 1) * limit;

        values.push(offset, limit);

        const query = `SELECT * FROM products ${where} ORDER BY ${sort} LIMIT ?, ?`;
        const [rows] = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: "Products retrieved successfully",
            data: rows
        });
    } catch (error) {
        console.error("listProducts error:", error);
        return next(new AppError("Failed to retrieve products", 500, error));
    }
};

export const getProduct = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        const product = rows[0] ?? null;
        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product retrieved successfully", data: product });
    } catch (error) {
        return next(new AppError("Failed to retrieve product", 500, error));
    }
};

export const getReviews = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT reviews.*, users.name AS username FROM reviews JOIN users ON users.id = reviews.user_id WHERE product_id = ? ORDER BY reviews.created_at DESC",
            [req.params.id]
        );
        res.status(200).json({ success: true, message: "Reviews retrieved successfully", data: rows });
    } catch (error) {
        return next(new AppError("Failed to retrieve reviews", 500, error));
    }
};

export const addReview = async (req, res, next) => {
    try {
        const rating = Number(req.body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: "Rating must be an integer from 1 to 5" });
        }

        // Intentionally vulnerable to Stored XSS: content is saved directly without sanitization
        await pool.query(
            "INSERT INTO reviews (product_id, user_id, content, rating) VALUES (?, ?, ?, ?)",
            [req.params.id, req.session.user.id, req.body.content, rating]
        );
        res.status(201).json({ success: true, message: "Review saved", data: {} });
    } catch (error) {
        return next(new AppError("Failed to add review", 500, error));
    }
};

export const createProduct = async (req, res, next) => {
    let uploadedFileUrl = null;
    try {
        const { name, description, price, stock, category } = req.body;

        // Support multipart/form-data via req.file, fallback to req.body.image if provided
        if (req.file) {
            uploadedFileUrl = getUploadUrl("products", req.file.filename);
        } else if (req.body.image) {
            uploadedFileUrl = req.body.image;
        }

        const [result] = await pool.query(
            "INSERT INTO products (name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)",
            [name, description, price, stock, category, uploadedFileUrl || ""]
        );

        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
        res.status(201).json({ success: true, message: "Product created", data: rows[0] });
    } catch (error) {
        // Clean up orphan file if DB operation fails
        if (req.file) {
            await deleteUploadedFile(getUploadUrl("products", req.file.filename));
        }
        return next(new AppError("Failed to create product", 500, error));
    }
};

export const updateProduct = async (req, res, next) => {
    let newUploadedUrl = null;
    try {
        const [existingRows] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        const existingProduct = existingRows[0];

        if (!existingProduct) {
            if (req.file) {
                await deleteUploadedFile(getUploadUrl("products", req.file.filename));
            }
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const { name, description, price, stock, category } = req.body;

        let finalImage = existingProduct.image;
        if (req.file) {
            newUploadedUrl = getUploadUrl("products", req.file.filename);
            finalImage = newUploadedUrl;
        } else if (req.body.image !== undefined && req.body.image !== "") {
            finalImage = req.body.image;
        }

        await pool.query(
            "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ? WHERE id = ?",
            [
                name ?? existingProduct.name,
                description ?? existingProduct.description,
                price !== undefined ? price : existingProduct.price,
                stock !== undefined ? stock : existingProduct.stock,
                category ?? existingProduct.category,
                finalImage,
                req.params.id
            ]
        );

        // On successful DB update, delete previous image if a new one was uploaded
        if (newUploadedUrl && existingProduct.image && existingProduct.image !== newUploadedUrl) {
            await deleteUploadedFile(existingProduct.image);
        }

        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        // Clean up newly uploaded file if update fails
        if (newUploadedUrl) {
            await deleteUploadedFile(newUploadedUrl);
        }
        return next(new AppError("Failed to update product", 500, error));
    }
};

export const deleteProduct = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        const product = rows[0];

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);

        // Safely delete associated image from filesystem if it exists
        if (product.image) {
            await deleteUploadedFile(product.image);
        }

        res.json({ success: true, data: { message: "Product deleted" } });
    } catch (error) {
        return next(new AppError("Failed to delete product", 500, error));
    }
};

export const download = (req, res, next) => {
    try {
        const filename = req.query.file;
        if (!filename) {
            return res.status(400).json({ success: false, error: "File parameter is required" });
        }

        // Intentionally vulnerable to Path Traversal
        const filePath = path.join(UPLOADS_ROOT, filename);
        res.download(filePath);
    } catch (error) {
        return next(new AppError("Failed to download file", 500, error));
    }
};
