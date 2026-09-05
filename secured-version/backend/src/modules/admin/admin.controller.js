import axios from "axios";
import child_process from "child_process";
import { pool } from "../../DB/DBConnection.js";

export const getStatistics = async (req, res, next) => {
    try {
        const [[users]] = await pool.query("SELECT COUNT(*) AS total FROM users");
        const [[products]] = await pool.query("SELECT COUNT(*) AS total FROM products");
        const [[orders]] = await pool.query("SELECT COUNT(*) AS total FROM orders");
        const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status != 'cancelled'");
        res.json({
            success: true,
            data: {
                users: users.total,
                products: products.total,
                orders: orders.total,
                revenue: revenue.total
            }
        });
    } catch (error) {
        next(error);
    }
};

export const listUsers = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const listOrders = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        await pool.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
        res.json({ success: true, data: { message: "Order updated" } });
    } catch (error) {
        next(error);
    }
};

export const fetchImage = async (req, res, next) => {
    try {
        // Intentionally vulnerable to SSRF: directly fetches user-supplied URL with Axios
        const response = await axios.get(req.body.url, { responseType: "arraybuffer" });
        res.type(response.headers["content-type"] || "application/octet-stream").send(response.data);
    } catch (error) {
        next(error);
    }
};

import { execFile } from "child_process";

const IP_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export const ping = (req, res, next) => {
    const { ip } = req.body;

    if (!ip || typeof ip !== "string" || !IP_REGEX.test(ip)) {
        return res.status(400).json({ success: false, error: "Invalid IP address" });
    }

    const pingCountFlag = process.platform === "win32" ? "-n" : "-c";
    execFile("ping", [pingCountFlag, "2", ip], (err, stdout) => {
        if (err) return next(err);
        res.type("text/plain").send(stdout);
    });
};
