import ejs from "ejs";
import axios from "axios";
import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { pool } from "../../DB/DBConnection.js";
import { safeFetch } from "../../utils/ssrfGuard.js";

export const profile = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
            [req.session.user.id]
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        next(error);
    }
};

// Fixed: CSRF
export const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user.id;

        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: "A valid email is required" });
        }

        await pool.query(
            "UPDATE users SET name = COALESCE(?, name), email = ? WHERE id = ?",
            [name || null, email, userId]
        );

        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
            [userId]
        );

        req.session.user = { ...req.session.user, ...rows[0] };

        res.json({ success: true, message: "Account details updated", data: rows[0] });
    } catch (error) {
        next(error);
    }
};

// Fixed: SSRF
export const importAvatar = async (req, res, next) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== "string") {
            return res.status(400).json({ success: false, error: "Image URL is required" });
        }

        const response = await safeFetch(url);
        res.type(response.headers["content-type"] || "application/octet-stream").send(response.data);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || "Unable to import that image" });
    }
};

// Fixed: OS Command Injection
const HOSTNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,253}[a-zA-Z0-9])?$/;

export const networkDiagnostics = (req, res, next) => {
    const { host } = req.body;
    if (!host || typeof host !== "string" || host.length > 255 || !HOSTNAME_PATTERN.test(host)) {
        return res.status(400).json({ success: false, error: "Enter a valid hostname or IP address" });
    }

    const countFlag = process.platform === "win32" ? "-n" : "-c";
    execFile("ping", [countFlag, "2", host], (err, stdout) => {
        if (err && !stdout) return next(err);
        res.type("text/plain").send(stdout || "No response");
    });
};

export const invoice = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const requestedOrderId = req.query.orderId;
        const [orders] = await pool.query(
            requestedOrderId
                ? "SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.id = ? AND orders.user_id = ?"
                : "SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.user_id = ? ORDER BY orders.created_at DESC LIMIT 1",
            requestedOrderId ? [requestedOrderId, userId] : [userId]
        );
        const order = orders[0];

        if (!order) {
            return res.status(404).send("Invoice order not found");
        }

        const [items] = await pool.query(
            "SELECT order_items.quantity, order_items.price, products.name AS product_name FROM order_items JOIN products ON products.id = order_items.product_id WHERE order_items.order_id = ? ORDER BY order_items.id",
            [order.id]
        );

        const invoice = {
            order,
            items: items.map((item) => ({
                ...item,
                subtotal: Math.round(Number(item.price) * 100) * item.quantity
            }))
        };
        invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.subtotal, 0);
        invoice.total = Math.round(Number(order.total_price) * 100);

        const templatePath = new URL("../../views/invoice.ejs", import.meta.url);
        const source = await readFile(templatePath, "utf8");
        // Fixed: SSTI
        const customerName = req.query.name ?? order.customer_name;
        const html = ejs.render(source, { invoice, customerName });
        if (req.query.download === "1") {
            res.attachment(`invoice-${order.id}.html`);
        }
        res.send(html);
    } catch (error) {
        next(error);
    }
};
